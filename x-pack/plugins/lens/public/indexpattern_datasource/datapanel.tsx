/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './datapanel.scss';
import { uniq, groupBy } from 'lodash';
import React, { useState, memo, useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiCallOut,
  EuiFormControlLayout,
  EuiSpacer,
  EuiFilterGroup,
  EuiFilterButton,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DataPublicPluginStart, EsQueryConfig, Query, Filter } from 'src/plugins/data/public';
import { htmlIdGenerator } from '@elastic/eui';
import { DatasourceDataPanelProps, DataType, StateSetter } from '../types';
import { ChildDragDropProvider, DragContextState } from '../drag_drop';
import {
  IndexPattern,
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPatternRef,
} from './types';
import { trackUiEvent } from '../lens_ui_telemetry';
import { syncExistingFields } from './loader';
import { fieldExists } from './pure_helpers';
import { Loader } from '../loader';
import { esQuery, IIndexPattern } from '../../../../../src/plugins/data/public';

export type Props = DatasourceDataPanelProps<IndexPatternPrivateState> & {
  data: DataPublicPluginStart;
  changeIndexPattern: (
    id: string,
    state: IndexPatternPrivateState,
    setState: StateSetter<IndexPatternPrivateState>
  ) => void;
  charts: ChartsPluginSetup;
};
import { LensFieldIcon } from './lens_field_icon';
import { ChangeIndexPattern } from './change_indexpattern';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { FieldGroups, FieldList } from './field_list';

function sortFields(fieldA: IndexPatternField, fieldB: IndexPatternField) {
  return fieldA.displayName.localeCompare(fieldB.displayName, undefined, { sensitivity: 'base' });
}

const supportedFieldTypes = new Set(['string', 'number', 'boolean', 'date', 'ip', 'document']);

const fieldTypeNames: Record<DataType, string> = {
  document: i18n.translate('xpack.lens.datatypes.record', { defaultMessage: 'record' }),
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'number' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'date' }),
  ip: i18n.translate('xpack.lens.datatypes.ipAddress', { defaultMessage: 'IP' }),
};

// Wrapper around esQuery.buildEsQuery, handling errors (e.g. because a query can't be parsed) by
// returning a query dsl object not matching anything
function buildSafeEsQuery(
  indexPattern: IIndexPattern,
  query: Query,
  filters: Filter[],
  queryConfig: EsQueryConfig
) {
  try {
    return esQuery.buildEsQuery(indexPattern, query, filters, queryConfig);
  } catch (e) {
    return {
      bool: {
        must_not: {
          match_all: {},
        },
      },
    };
  }
}

export function IndexPatternDataPanel({
  setState,
  state,
  dragDropContext,
  core,
  data,
  query,
  filters,
  dateRange,
  changeIndexPattern,
  charts,
  showNoDataPopover,
}: Props) {
  const { indexPatternRefs, indexPatterns, currentIndexPatternId } = state;
  const onChangeIndexPattern = useCallback(
    (id: string) => changeIndexPattern(id, state, setState),
    [state, setState, changeIndexPattern]
  );

  const indexPatternList = uniq(
    Object.values(state.layers)
      .map((l) => l.indexPatternId)
      .concat(currentIndexPatternId)
  )
    .sort((a, b) => a.localeCompare(b))
    .filter((id) => !!indexPatterns[id])
    .map((id) => ({
      id,
      title: indexPatterns[id].title,
      timeFieldName: indexPatterns[id].timeFieldName,
      fields: indexPatterns[id].fields,
      hasRestrictions: indexPatterns[id].hasRestrictions,
    }));

  const dslQuery = buildSafeEsQuery(
    indexPatterns[currentIndexPatternId] as IIndexPattern,
    query,
    filters,
    esQuery.getEsQueryConfig(core.uiSettings)
  );

  return (
    <>
      <Loader
        load={() =>
          syncExistingFields({
            dateRange,
            setState,
            isFirstExistenceFetch: state.isFirstExistenceFetch,
            currentIndexPatternTitle: indexPatterns[currentIndexPatternId].title,
            showNoDataPopover,
            indexPatterns: indexPatternList,
            fetchJson: core.http.post,
            dslQuery,
          })
        }
        loadDeps={[
          query,
          filters,
          dateRange.fromDate,
          dateRange.toDate,
          indexPatternList.map((x) => `${x.title}:${x.timeFieldName}`).join(','),
        ]}
      />

      {Object.keys(indexPatterns).length === 0 ? (
        <EuiFlexGroup
          gutterSize="m"
          className="lnsInnerIndexPatternDataPanel"
          direction="column"
          responsive={false}
        >
          <EuiFlexItem grow={null}>
            <EuiCallOut
              data-test-subj="indexPattern-no-indexpatterns"
              title={i18n.translate('xpack.lens.indexPattern.noPatternsLabel', {
                defaultMessage: 'No index patterns',
              })}
              color="warning"
              iconType="alert"
            >
              <p>
                <FormattedMessage
                  id="xpack.lens.indexPattern.noPatternsDescription"
                  defaultMessage="Please create an index pattern or switch to another data source"
                />
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <MemoizedDataPanel
          currentIndexPatternId={currentIndexPatternId}
          indexPatternRefs={indexPatternRefs}
          indexPatterns={indexPatterns}
          query={query}
          dateRange={dateRange}
          filters={filters}
          dragDropContext={dragDropContext}
          core={core}
          data={data}
          charts={charts}
          onChangeIndexPattern={onChangeIndexPattern}
          existingFields={state.existingFields}
          existenceFetchFailed={state.existenceFetchFailed}
        />
      )}
    </>
  );
}

interface DataPanelState {
  nameFilter: string;
  typeFilter: DataType[];
  isTypeFilterOpen: boolean;
  isAvailableAccordionOpen: boolean;
  isEmptyAccordionOpen: boolean;
  isMetaAccordionOpen: boolean;
}

const defaultFieldGroups: {
  specialFields: IndexPatternField[];
  availableFields: IndexPatternField[];
  emptyFields: IndexPatternField[];
  metaFields: IndexPatternField[];
} = {
  specialFields: [],
  availableFields: [],
  emptyFields: [],
  metaFields: [],
};

const fieldFiltersLabel = i18n.translate('xpack.lens.indexPatterns.fieldFiltersLabel', {
  defaultMessage: 'Field filters',
});

const htmlId = htmlIdGenerator('datapanel');
const fieldSearchDescriptionId = htmlId();

export const InnerIndexPatternDataPanel = function InnerIndexPatternDataPanel({
  currentIndexPatternId,
  indexPatternRefs,
  indexPatterns,
  existenceFetchFailed,
  query,
  dateRange,
  filters,
  dragDropContext,
  onChangeIndexPattern,
  core,
  data,
  existingFields,
  charts,
}: Omit<DatasourceDataPanelProps, 'state' | 'setState' | 'showNoDataPopover'> & {
  data: DataPublicPluginStart;
  currentIndexPatternId: string;
  indexPatternRefs: IndexPatternRef[];
  indexPatterns: Record<string, IndexPattern>;
  dragDropContext: DragContextState;
  onChangeIndexPattern: (newId: string) => void;
  existingFields: IndexPatternPrivateState['existingFields'];
  charts: ChartsPluginSetup;
  existenceFetchFailed?: boolean;
}) {
  const [localState, setLocalState] = useState<DataPanelState>({
    nameFilter: '',
    typeFilter: [],
    isTypeFilterOpen: false,
    isAvailableAccordionOpen: true,
    isEmptyAccordionOpen: false,
    isMetaAccordionOpen: false,
  });
  const currentIndexPattern = indexPatterns[currentIndexPatternId];
  const allFields = currentIndexPattern.fields;
  const clearLocalState = () => setLocalState((s) => ({ ...s, nameFilter: '', typeFilter: [] }));
  const hasSyncedExistingFields = existingFields[currentIndexPattern.title];
  const availableFieldTypes = uniq(allFields.map(({ type }) => type)).filter(
    (type) => type in fieldTypeNames
  );

  const fieldInfoUnavailable = existenceFetchFailed || currentIndexPattern.hasRestrictions;

  const unfilteredFieldGroups: FieldGroups = useMemo(() => {
    const containsData = (field: IndexPatternField) => {
      const overallField = currentIndexPattern.getFieldByName(field.name);

      return (
        overallField && fieldExists(existingFields, currentIndexPattern.title, overallField.name)
      );
    };

    const allSupportedTypesFields = allFields.filter((field) =>
      supportedFieldTypes.has(field.type)
    );
    const sorted = allSupportedTypesFields.sort(sortFields);
    let groupedFields;
    // optimization before existingFields are synced
    if (!hasSyncedExistingFields) {
      groupedFields = {
        ...defaultFieldGroups,
        ...groupBy(sorted, (field) => {
          if (field.type === 'document') {
            return 'specialFields';
          } else if (field.meta) {
            return 'metaFields';
          } else {
            return 'emptyFields';
          }
        }),
      };
    }
    groupedFields = {
      ...defaultFieldGroups,
      ...groupBy(sorted, (field) => {
        if (field.type === 'document') {
          return 'specialFields';
        } else if (field.meta) {
          return 'metaFields';
        } else if (containsData(field)) {
          return 'availableFields';
        } else return 'emptyFields';
      }),
    };

    const fieldGroupDefinitions: FieldGroups = {
      SpecialFields: {
        fields: groupedFields.specialFields,
        fieldCount: 1,
        isAffectedByGlobalFilter: false,
        isAffectedByTimeFilter: false,
        isInitiallyOpen: false,
        showInAccordion: false,
        title: '',
        hideDetails: true,
      },
      AvailableFields: {
        fields: groupedFields.availableFields,
        fieldCount: groupedFields.availableFields.length,
        isInitiallyOpen: true,
        showInAccordion: true,
        title: fieldInfoUnavailable
          ? i18n.translate('xpack.lens.indexPattern.allFieldsLabel', {
              defaultMessage: 'All fields',
            })
          : i18n.translate('xpack.lens.indexPattern.availableFieldsLabel', {
              defaultMessage: 'Available fields',
            }),

        isAffectedByGlobalFilter: !!filters.length,
        isAffectedByTimeFilter: true,
        hideDetails: fieldInfoUnavailable,
        defaultNoFieldsMessage: i18n.translate('xpack.lens.indexPatterns.noAvailableDataLabel', {
          defaultMessage: `There are no available fields that contain data.`,
        }),
      },
      EmptyFields: {
        fields: groupedFields.emptyFields,
        fieldCount: groupedFields.emptyFields.length,
        isAffectedByGlobalFilter: false,
        isAffectedByTimeFilter: false,
        isInitiallyOpen: false,
        showInAccordion: true,
        hideDetails: false,
        title: i18n.translate('xpack.lens.indexPattern.emptyFieldsLabel', {
          defaultMessage: 'Empty fields',
        }),
        defaultNoFieldsMessage: i18n.translate('xpack.lens.indexPatterns.noEmptyDataLabel', {
          defaultMessage: `There are no empty fields.`,
        }),
      },
      MetaFields: {
        fields: groupedFields.metaFields,
        fieldCount: groupedFields.metaFields.length,
        isAffectedByGlobalFilter: false,
        isAffectedByTimeFilter: false,
        isInitiallyOpen: false,
        showInAccordion: true,
        hideDetails: false,
        title: i18n.translate('xpack.lens.indexPattern.metaFieldsLabel', {
          defaultMessage: 'Meta fields',
        }),
        defaultNoFieldsMessage: i18n.translate('xpack.lens.indexPatterns.noMetaDataLabel', {
          defaultMessage: `There are no meta fields.`,
        }),
      },
    };

    // do not show empty field accordion if there is no existence information
    if (fieldInfoUnavailable) {
      delete fieldGroupDefinitions.EmptyFields;
    }

    return fieldGroupDefinitions;
  }, [
    allFields,
    existingFields,
    currentIndexPattern,
    hasSyncedExistingFields,
    fieldInfoUnavailable,
    filters.length,
  ]);

  const fieldGroups: FieldGroups = useMemo(() => {
    const filterFieldGroup = (fieldGroup: IndexPatternField[]) =>
      fieldGroup.filter((field) => {
        if (
          localState.nameFilter.length &&
          !field.name.toLowerCase().includes(localState.nameFilter.toLowerCase()) &&
          !field.displayName.toLowerCase().includes(localState.nameFilter.toLowerCase())
        ) {
          return false;
        }
        if (localState.typeFilter.length > 0) {
          return localState.typeFilter.includes(field.type as DataType);
        }
        return true;
      });
    return Object.fromEntries(
      Object.entries(unfilteredFieldGroups).map(([name, group]) => [
        name,
        { ...group, fields: filterFieldGroup(group.fields) },
      ])
    );
  }, [unfilteredFieldGroups, localState.nameFilter, localState.typeFilter]);

  const fieldProps = useMemo(
    () => ({
      core,
      data,
      indexPattern: currentIndexPattern,
      highlight: localState.nameFilter.toLowerCase(),
      dateRange,
      query,
      filters,
      chartsThemeService: charts.theme,
    }),
    [
      core,
      data,
      currentIndexPattern,
      dateRange,
      query,
      filters,
      localState.nameFilter,
      charts.theme,
    ]
  );

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiFlexGroup
        gutterSize="none"
        className="lnsInnerIndexPatternDataPanel"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <div className="lnsInnerIndexPatternDataPanel__header">
            <ChangeIndexPattern
              data-test-subj="indexPattern-switcher"
              trigger={{
                label: currentIndexPattern.title,
                title: currentIndexPattern.title,
                'data-test-subj': 'indexPattern-switch-link',
                fontWeight: 'bold',
              }}
              indexPatternId={currentIndexPatternId}
              indexPatternRefs={indexPatternRefs}
              onChangeIndexPattern={(newId: string) => {
                onChangeIndexPattern(newId);
                clearLocalState();
              }}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormControlLayout
            icon="search"
            fullWidth
            clear={{
              title: i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                defaultMessage: 'Clear name and type filters',
              }),
              'aria-label': i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                defaultMessage: 'Clear name and type filters',
              }),
              onClick: () => {
                trackUiEvent('indexpattern_filters_cleared');
                clearLocalState();
              },
            }}
          >
            <input
              className="euiFieldText euiFieldText--fullWidth lnsInnerIndexPatternDataPanel__textField"
              data-test-subj="lnsIndexPatternFieldSearch"
              placeholder={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                defaultMessage: 'Search field names',
                description: 'Search the list of fields in the index pattern for the provided text',
              })}
              value={localState.nameFilter}
              onChange={(e) => {
                setLocalState({ ...localState, nameFilter: e.target.value });
              }}
              aria-label={i18n.translate('xpack.lens.indexPatterns.filterByNameAriaLabel', {
                defaultMessage: 'Search fields',
              })}
              aria-describedby={fieldSearchDescriptionId}
            />
          </EuiFormControlLayout>

          <EuiSpacer size="xs" />

          <EuiFilterGroup>
            <EuiPopover
              id="dataPanelTypeFilter"
              panelClassName="euiFilterGroup__popoverPanel"
              panelPaddingSize="none"
              anchorPosition="rightUp"
              display="block"
              isOpen={localState.isTypeFilterOpen}
              closePopover={() => setLocalState(() => ({ ...localState, isTypeFilterOpen: false }))}
              button={
                <EuiFilterButton
                  iconType="arrowDown"
                  isSelected={localState.isTypeFilterOpen}
                  numFilters={localState.typeFilter.length}
                  hasActiveFilters={!!localState.typeFilter.length}
                  numActiveFilters={localState.typeFilter.length}
                  data-test-subj="lnsIndexPatternFiltersToggle"
                  onClick={() => {
                    setLocalState((s) => ({
                      ...s,
                      isTypeFilterOpen: !localState.isTypeFilterOpen,
                    }));
                  }}
                >
                  {fieldFiltersLabel}
                </EuiFilterButton>
              }
            >
              <EuiContextMenuPanel
                watchedItemProps={['icon', 'disabled']}
                data-test-subj="lnsIndexPatternTypeFilterOptions"
                items={(availableFieldTypes as DataType[]).map((type) => (
                  <EuiContextMenuItem
                    className="lnsInnerIndexPatternDataPanel__filterType"
                    key={type}
                    icon={localState.typeFilter.includes(type) ? 'check' : 'empty'}
                    data-test-subj={`typeFilter-${type}`}
                    onClick={() => {
                      trackUiEvent('indexpattern_type_filter_toggled');
                      setLocalState((s) => ({
                        ...s,
                        typeFilter: localState.typeFilter.includes(type)
                          ? localState.typeFilter.filter((t) => t !== type)
                          : [...localState.typeFilter, type],
                      }));
                    }}
                  >
                    <span className="lnsInnerIndexPatternDataPanel__filterTypeInner">
                      <LensFieldIcon type={type} /> {fieldTypeNames[type]}
                    </span>
                  </EuiContextMenuItem>
                ))}
              />
            </EuiPopover>
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiScreenReaderOnly>
          <div aria-live="polite" id={fieldSearchDescriptionId}>
            {i18n.translate('xpack.lens.indexPatterns.fieldSearchLiveRegion', {
              defaultMessage:
                '{availableFields} available {availableFields, plural, one {field} other {fields}}. {emptyFields} empty {emptyFields, plural, one {field} other {fields}}. {metaFields} meta {metaFields, plural, one {field} other {fields}}.',
              values: {
                availableFields: fieldGroups.AvailableFields.fields.length,
                // empty fields can be undefined if there is no existence information to be fetched
                emptyFields: fieldGroups.EmptyFields?.fields.length || 0,
                metaFields: fieldGroups.MetaFields.fields.length,
              },
            })}
          </div>
        </EuiScreenReaderOnly>
        <EuiFlexItem>
          <FieldList
            exists={(field) =>
              field.type === 'document' ||
              fieldExists(existingFields, currentIndexPattern.title, field.name)
            }
            fieldProps={fieldProps}
            fieldGroups={fieldGroups}
            hasSyncedExistingFields={!!hasSyncedExistingFields}
            filter={{
              nameFilter: localState.nameFilter,
              typeFilter: localState.typeFilter,
            }}
            currentIndexPatternId={currentIndexPatternId}
            existenceFetchFailed={existenceFetchFailed}
            existFieldsInIndex={!!allFields.length}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
};

export const MemoizedDataPanel = memo(InnerIndexPatternDataPanel);

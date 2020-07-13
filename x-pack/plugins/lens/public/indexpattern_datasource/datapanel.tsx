/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './datapanel.scss';
import { uniq, keyBy, groupBy, throttle } from 'lodash';
import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiContextMenuPanelProps,
  EuiPopover,
  EuiCallOut,
  EuiFormControlLayout,
  EuiSpacer,
  EuiFilterGroup,
  EuiFilterButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DataPublicPluginStart, EsQueryConfig, Query, Filter } from 'src/plugins/data/public';
import { DatasourceDataPanelProps, DataType, StateSetter } from '../types';
import { ChildDragDropProvider, DragContextState } from '../drag_drop';
import { FieldItem } from './field_item';
import { NoFieldsCallout } from './no_fields_callout';
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
import { FieldsAccordion } from './fields_accordion';
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

// TODO the typings for EuiContextMenuPanel are incorrect - watchedItemProps is missing. This can be removed when the types are adjusted
const FixedEuiContextMenuPanel = (EuiContextMenuPanel as unknown) as React.FunctionComponent<
  EuiContextMenuPanelProps & { watchedItemProps: string[] }
>;

function sortFields(fieldA: IndexPatternField, fieldB: IndexPatternField) {
  return fieldA.name.localeCompare(fieldB.name, undefined, { sensitivity: 'base' });
}

const supportedFieldTypes = new Set(['string', 'number', 'boolean', 'date', 'ip', 'document']);
const PAGINATION_SIZE = 50;

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
}

export interface FieldsGroup {
  specialFields: IndexPatternField[];
  availableFields: IndexPatternField[];
  emptyFields: IndexPatternField[];
}

const defaultFieldGroups = {
  specialFields: [],
  availableFields: [],
  emptyFields: [],
};

const fieldFiltersLabel = i18n.translate('xpack.lens.indexPatterns.fieldFiltersLabel', {
  defaultMessage: 'Field filters',
});

export const InnerIndexPatternDataPanel = function InnerIndexPatternDataPanel({
  currentIndexPatternId,
  indexPatternRefs,
  indexPatterns,
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
}) {
  const [localState, setLocalState] = useState<DataPanelState>({
    nameFilter: '',
    typeFilter: [],
    isTypeFilterOpen: false,
    isAvailableAccordionOpen: true,
    isEmptyAccordionOpen: false,
  });
  const [pageSize, setPageSize] = useState(PAGINATION_SIZE);
  const [scrollContainer, setScrollContainer] = useState<Element | undefined>(undefined);
  const currentIndexPattern = indexPatterns[currentIndexPatternId];
  const allFields = currentIndexPattern.fields;
  const clearLocalState = () => setLocalState((s) => ({ ...s, nameFilter: '', typeFilter: [] }));
  const hasSyncedExistingFields = existingFields[currentIndexPattern.title];
  const availableFieldTypes = uniq(allFields.map(({ type }) => type)).filter(
    (type) => type in fieldTypeNames
  );

  useEffect(() => {
    // Reset the scroll if we have made material changes to the field list
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      setPageSize(PAGINATION_SIZE);
    }
  }, [localState.nameFilter, localState.typeFilter, currentIndexPatternId, scrollContainer]);

  const fieldGroups: FieldsGroup = useMemo(() => {
    const containsData = (field: IndexPatternField) => {
      const fieldByName = keyBy(allFields, 'name');
      const overallField = fieldByName[field.name];

      return (
        overallField && fieldExists(existingFields, currentIndexPattern.title, overallField.name)
      );
    };

    const allSupportedTypesFields = allFields.filter((field) =>
      supportedFieldTypes.has(field.type)
    );
    const sorted = allSupportedTypesFields.sort(sortFields);
    // optimization before existingFields are synced
    if (!hasSyncedExistingFields) {
      return {
        ...defaultFieldGroups,
        ...groupBy(sorted, (field) => {
          if (field.type === 'document') {
            return 'specialFields';
          } else {
            return 'emptyFields';
          }
        }),
      };
    }
    return {
      ...defaultFieldGroups,
      ...groupBy(sorted, (field) => {
        if (field.type === 'document') {
          return 'specialFields';
        } else if (containsData(field)) {
          return 'availableFields';
        } else return 'emptyFields';
      }),
    };
  }, [allFields, existingFields, currentIndexPattern, hasSyncedExistingFields]);

  const filteredFieldGroups: FieldsGroup = useMemo(() => {
    const filterFieldGroup = (fieldGroup: IndexPatternField[]) =>
      fieldGroup.filter((field) => {
        if (
          localState.nameFilter.length &&
          !field.name.toLowerCase().includes(localState.nameFilter.toLowerCase())
        ) {
          return false;
        }

        if (localState.typeFilter.length > 0) {
          return localState.typeFilter.includes(field.type as DataType);
        }
        return true;
      });

    return Object.entries(fieldGroups).reduce((acc, [name, fields]) => {
      return {
        ...acc,
        [name]: filterFieldGroup(fields),
      };
    }, defaultFieldGroups);
  }, [fieldGroups, localState.nameFilter, localState.typeFilter]);

  const lazyScroll = useCallback(() => {
    if (scrollContainer) {
      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >
        scrollContainer.scrollHeight * 0.9;
      if (nearBottom) {
        const displayedFieldsLength =
          (localState.isAvailableAccordionOpen ? filteredFieldGroups.availableFields.length : 0) +
          (localState.isEmptyAccordionOpen ? filteredFieldGroups.emptyFields.length : 0);
        setPageSize(
          Math.max(
            PAGINATION_SIZE,
            Math.min(pageSize + PAGINATION_SIZE * 0.5, displayedFieldsLength)
          )
        );
      }
    }
  }, [
    scrollContainer,
    localState.isAvailableAccordionOpen,
    localState.isEmptyAccordionOpen,
    filteredFieldGroups,
    pageSize,
    setPageSize,
  ]);

  const [paginatedAvailableFields, paginatedEmptyFields]: [
    IndexPatternField[],
    IndexPatternField[]
  ] = useMemo(() => {
    const { availableFields, emptyFields } = filteredFieldGroups;
    const isAvailableAccordionOpen = localState.isAvailableAccordionOpen;
    const isEmptyAccordionOpen = localState.isEmptyAccordionOpen;

    if (isAvailableAccordionOpen && isEmptyAccordionOpen) {
      if (availableFields.length > pageSize) {
        return [availableFields.slice(0, pageSize), []];
      } else {
        return [availableFields, emptyFields.slice(0, pageSize - availableFields.length)];
      }
    }
    if (isAvailableAccordionOpen && !isEmptyAccordionOpen) {
      return [availableFields.slice(0, pageSize), []];
    }

    if (!isAvailableAccordionOpen && isEmptyAccordionOpen) {
      return [[], emptyFields.slice(0, pageSize)];
    }
    return [[], []];
  }, [
    localState.isAvailableAccordionOpen,
    localState.isEmptyAccordionOpen,
    filteredFieldGroups,
    pageSize,
  ]);

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
    [core, data, currentIndexPattern, dateRange, query, filters, localState.nameFilter]
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
                className: 'lnsInnerIndexPatternDataPanel__triggerButton',
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
              <FixedEuiContextMenuPanel
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
        <EuiFlexItem>
          <div
            className="lnsInnerIndexPatternDataPanel__listWrapper"
            ref={(el) => {
              if (el && !el.dataset.dynamicScroll) {
                el.dataset.dynamicScroll = 'true';
                setScrollContainer(el);
              }
            }}
            onScroll={throttle(lazyScroll, 100)}
          >
            <div className="lnsInnerIndexPatternDataPanel__list">
              {filteredFieldGroups.specialFields.map((field: IndexPatternField) => (
                <FieldItem
                  {...fieldProps}
                  exists={!!fieldGroups.availableFields.length}
                  field={field}
                  hideDetails={true}
                  key={field.name}
                />
              ))}

              <EuiSpacer size="s" />
              <FieldsAccordion
                initialIsOpen={localState.isAvailableAccordionOpen}
                id="lnsIndexPatternAvailableFields"
                label={i18n.translate('xpack.lens.indexPattern.availableFieldsLabel', {
                  defaultMessage: 'Available fields',
                })}
                exists={true}
                hasLoaded={!!hasSyncedExistingFields}
                fieldsCount={filteredFieldGroups.availableFields.length}
                isFiltered={
                  filteredFieldGroups.availableFields.length !== fieldGroups.availableFields.length
                }
                paginatedFields={paginatedAvailableFields}
                fieldProps={fieldProps}
                onToggle={(open) => {
                  setLocalState((s) => ({
                    ...s,
                    isAvailableAccordionOpen: open,
                  }));
                  const displayedFieldLength =
                    (open ? filteredFieldGroups.availableFields.length : 0) +
                    (localState.isEmptyAccordionOpen ? filteredFieldGroups.emptyFields.length : 0);
                  setPageSize(
                    Math.max(PAGINATION_SIZE, Math.min(pageSize * 1.5, displayedFieldLength))
                  );
                }}
                renderCallout={
                  <NoFieldsCallout
                    isAffectedByGlobalFilter={!!filters.length}
                    isAffectedByFieldFilter={
                      !!(localState.typeFilter.length || localState.nameFilter.length)
                    }
                    isAffectedByTimerange={true}
                    existFieldsInIndex={!!fieldGroups.emptyFields.length}
                  />
                }
              />
              <EuiSpacer size="m" />
              <FieldsAccordion
                initialIsOpen={localState.isEmptyAccordionOpen}
                isFiltered={
                  filteredFieldGroups.emptyFields.length !== fieldGroups.emptyFields.length
                }
                fieldsCount={filteredFieldGroups.emptyFields.length}
                paginatedFields={paginatedEmptyFields}
                hasLoaded={!!hasSyncedExistingFields}
                exists={false}
                fieldProps={fieldProps}
                id="lnsIndexPatternEmptyFields"
                label={i18n.translate('xpack.lens.indexPattern.emptyFieldsLabel', {
                  defaultMessage: 'Empty fields',
                })}
                onToggle={(open) => {
                  setLocalState((s) => ({
                    ...s,
                    isEmptyAccordionOpen: open,
                  }));
                  const displayedFieldLength =
                    (localState.isAvailableAccordionOpen
                      ? filteredFieldGroups.availableFields.length
                      : 0) + (open ? filteredFieldGroups.emptyFields.length : 0);
                  setPageSize(
                    Math.max(PAGINATION_SIZE, Math.min(pageSize * 1.5, displayedFieldLength))
                  );
                }}
                renderCallout={
                  <NoFieldsCallout
                    isAffectedByFieldFilter={
                      !!(localState.typeFilter.length || localState.nameFilter.length)
                    }
                    existFieldsInIndex={!!fieldGroups.emptyFields.length}
                  />
                }
              />
              <EuiSpacer size="m" />
            </div>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
};

export const MemoizedDataPanel = memo(InnerIndexPatternDataPanel);

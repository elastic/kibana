/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './datapanel.scss';
import { uniq, groupBy } from 'lodash';
import React, { useState, memo, useCallback, useMemo, useRef, useEffect } from 'react';
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
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart } from 'kibana/public';
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
import { loadIndexPatterns, syncExistingFields } from './loader';
import { fieldExists } from './pure_helpers';
import { Loader } from '../loader';
import { esQuery, IIndexPattern } from '../../../../../src/plugins/data/public';
import { IndexPatternFieldEditorStart } from '../../../../../src/plugins/index_pattern_field_editor/public';

export type Props = Omit<DatasourceDataPanelProps<IndexPatternPrivateState>, 'core'> & {
  data: DataPublicPluginStart;
  changeIndexPattern: (
    id: string,
    state: IndexPatternPrivateState,
    setState: StateSetter<IndexPatternPrivateState>
  ) => void;
  charts: ChartsPluginSetup;
  core: CoreStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
};
import { LensFieldIcon } from './lens_field_icon';
import { ChangeIndexPattern } from './change_indexpattern';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { FieldGroups, FieldList } from './field_list';

function sortFields(fieldA: IndexPatternField, fieldB: IndexPatternField) {
  return fieldA.displayName.localeCompare(fieldB.displayName, undefined, { sensitivity: 'base' });
}

const supportedFieldTypes = new Set([
  'string',
  'number',
  'boolean',
  'date',
  'ip',
  'number_range',
  'date_range',
  'ip_range',
  'histogram',
  'document',
]);

const fieldTypeNames: Record<DataType, string> = {
  document: i18n.translate('xpack.lens.datatypes.record', { defaultMessage: 'record' }),
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'number' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'date' }),
  ip: i18n.translate('xpack.lens.datatypes.ipAddress', { defaultMessage: 'IP' }),
  histogram: i18n.translate('xpack.lens.datatypes.histogram', { defaultMessage: 'histogram' }),
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
  indexPatternFieldEditor,
  showNoDataPopover,
  dropOntoWorkspace,
  hasSuggestionForField,
}: Props) {
  const { indexPatternRefs, indexPatterns, currentIndexPatternId } = state;
  const onChangeIndexPattern = useCallback(
    (id: string) => changeIndexPattern(id, state, setState),
    [state, setState, changeIndexPattern]
  );

  const onUpdateIndexPattern = useCallback(
    (indexPattern: IndexPattern) => {
      setState((prevState) => ({
        ...prevState,
        indexPatterns: {
          ...prevState.indexPatterns,
          [indexPattern.id]: indexPattern,
        },
      }));
    },
    [setState]
  );

  const indexPatternList = uniq(
    Object.values(state.layers)
      .map((l) => l.indexPatternId)
      .concat(currentIndexPatternId)
  )
    .filter((id) => !!indexPatterns[id])
    .sort((a, b) => a.localeCompare(b))
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
            currentIndexPatternTitle: indexPatterns[currentIndexPatternId]?.title || '',
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
          state.indexPatterns,
        ]}
      />

      {Object.keys(indexPatterns).length === 0 && indexPatternRefs.length === 0 ? (
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
          indexPatternFieldEditor={indexPatternFieldEditor}
          onChangeIndexPattern={onChangeIndexPattern}
          onUpdateIndexPattern={onUpdateIndexPattern}
          existingFields={state.existingFields}
          existenceFetchFailed={state.existenceFetchFailed}
          dropOntoWorkspace={dropOntoWorkspace}
          hasSuggestionForField={hasSuggestionForField}
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
  onUpdateIndexPattern,
  core,
  data,
  indexPatternFieldEditor,
  existingFields,
  charts,
  dropOntoWorkspace,
  hasSuggestionForField,
}: Omit<DatasourceDataPanelProps, 'state' | 'setState' | 'showNoDataPopover' | 'core'> & {
  data: DataPublicPluginStart;
  core: CoreStart;
  currentIndexPatternId: string;
  indexPatternRefs: IndexPatternRef[];
  indexPatterns: Record<string, IndexPattern>;
  dragDropContext: DragContextState;
  onChangeIndexPattern: (newId: string) => void;
  onUpdateIndexPattern: (indexPattern: IndexPattern) => void;
  existingFields: IndexPatternPrivateState['existingFields'];
  charts: ChartsPluginSetup;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
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

  const editPermission = indexPatternFieldEditor.userPermissions.editIndexPattern();

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
        helpText: i18n.translate('xpack.lens.indexPattern.allFieldsLabelHelp', {
          defaultMessage:
            'Available fields have data in the first 500 documents that match your filters. To view all fields, expand Empty fields. Some field types cannot be visualized in Lens, including full text and geographic fields.',
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
        helpText: i18n.translate('xpack.lens.indexPattern.emptyFieldsLabelHelp', {
          defaultMessage:
            'Empty fields did not contain any values in the first 500 documents based on your filters.',
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

  const checkFieldExists = useCallback(
    (field) =>
      field.type === 'document' ||
      fieldExists(existingFields, currentIndexPattern.title, field.name),
    [existingFields, currentIndexPattern.title]
  );

  const { nameFilter, typeFilter } = localState;

  const filter = useMemo(
    () => ({
      nameFilter,
      typeFilter,
    }),
    [nameFilter, typeFilter]
  );

  const closeFieldEditor = useRef<() => void | undefined>();

  useEffect(() => {
    return () => {
      // Make sure to close the editor when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
    };
  }, []);

  const refreshFieldList = useCallback(async () => {
    const newlyMappedIndexPattern = await loadIndexPatterns({
      indexPatternsService: data.indexPatterns,
      cache: {},
      patterns: [currentIndexPattern.id],
    });
    onUpdateIndexPattern(newlyMappedIndexPattern[currentIndexPattern.id]);
  }, [data, currentIndexPattern, onUpdateIndexPattern]);

  const editField = useMemo(
    () =>
      editPermission
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            trackUiEvent(`open_field_editor_${uiAction}`);
            const indexPatternInstance = await data.indexPatterns.get(currentIndexPattern.id);
            closeFieldEditor.current = indexPatternFieldEditor.openEditor({
              ctx: {
                indexPattern: indexPatternInstance,
              },
              fieldName,
              onSave: async () => {
                trackUiEvent(`save_field_${uiAction}`);
                await refreshFieldList();
              },
            });
          }
        : undefined,
    [data, indexPatternFieldEditor, currentIndexPattern, editPermission, refreshFieldList]
  );

  const removeField = useMemo(
    () =>
      editPermission
        ? async (fieldName: string) => {
            trackUiEvent('open_field_delete_modal');
            const indexPatternInstance = await data.indexPatterns.get(currentIndexPattern.id);
            closeFieldEditor.current = indexPatternFieldEditor.openDeleteModal({
              ctx: {
                indexPattern: indexPatternInstance,
              },
              fieldName,
              onDelete: async () => {
                trackUiEvent('delete_field');
                await refreshFieldList();
              },
            });
          }
        : undefined,
    [
      currentIndexPattern.id,
      data.indexPatterns,
      editPermission,
      indexPatternFieldEditor,
      refreshFieldList,
    ]
  );

  const addField = useMemo(
    () => (editPermission && editField ? () => editField(undefined, 'add') : undefined),
    [editField, editPermission]
  );

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

  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiFlexGroup
        gutterSize="none"
        className="lnsInnerIndexPatternDataPanel"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            className="lnsInnerIndexPatternDataPanel__header"
          >
            <EuiFlexItem grow={true} className="lnsInnerIndexPatternDataPanel__switcher">
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
            </EuiFlexItem>
            {addField && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  panelPaddingSize="s"
                  isOpen={popoverOpen}
                  closePopover={() => {
                    setPopoverOpen(false);
                  }}
                  ownFocus
                  data-test-subj="lnsIndexPatternActions-popover"
                  button={
                    <EuiButtonIcon
                      color="text"
                      iconType="boxesHorizontal"
                      data-test-subj="lnsIndexPatternActions"
                      aria-label={i18n.translate('xpack.lens.indexPatterns.actionsPopoverLabel', {
                        defaultMessage: 'Index pattern settings',
                      })}
                      onClick={() => {
                        setPopoverOpen(!popoverOpen);
                      }}
                    />
                  }
                >
                  <EuiContextMenuPanel
                    size="s"
                    items={[
                      <EuiContextMenuItem
                        key="add"
                        icon="indexOpen"
                        data-test-subj="indexPattern-add-field"
                        onClick={() => {
                          setPopoverOpen(false);
                          addField();
                        }}
                      >
                        {i18n.translate('xpack.lens.indexPatterns.addFieldButton', {
                          defaultMessage: 'Add field to index pattern',
                        })}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key="manage"
                        icon="indexSettings"
                        onClick={() => {
                          setPopoverOpen(false);
                          core.application.navigateToApp('management', {
                            path: `/kibana/indexPatterns/patterns/${currentIndexPattern.id}`,
                          });
                        }}
                      >
                        {i18n.translate('xpack.lens.indexPatterns.manageFieldButton', {
                          defaultMessage: 'Manage index pattern fields',
                        })}
                      </EuiContextMenuItem>,
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
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
              aria-label={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                defaultMessage: 'Search field names',
                description: 'Search the list of fields in the index pattern for the provided text',
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
            exists={checkFieldExists}
            fieldProps={fieldProps}
            fieldGroups={fieldGroups}
            hasSyncedExistingFields={!!hasSyncedExistingFields}
            filter={filter}
            currentIndexPatternId={currentIndexPatternId}
            existenceFetchFailed={existenceFetchFailed}
            existFieldsInIndex={!!allFields.length}
            dropOntoWorkspace={dropOntoWorkspace}
            hasSuggestionForField={hasSuggestionForField}
            editField={editField}
            removeField={removeField}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
};

export const MemoizedDataPanel = memo(InnerIndexPatternDataPanel);

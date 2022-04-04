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
import type { EsQueryConfig, Query, Filter } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from 'kibana/public';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { FieldFormatsStart } from 'src/plugins/field_formats/public';
import { htmlIdGenerator } from '@elastic/eui';
import { buildEsQuery } from '@kbn/es-query';
import type { DatasourceDataPanelProps, DataType, StateSetter } from '../types';
import { ChildDragDropProvider, DragContextState } from '../drag_drop';
import type {
  IndexPattern,
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPatternRef,
} from './types';
import { trackUiEvent } from '../lens_ui_telemetry';
import { loadIndexPatterns, syncExistingFields } from './loader';
import { fieldExists } from './pure_helpers';
import { Loader } from '../loader';
import { getEsQueryConfig } from '../../../../../src/plugins/data/public';
import { IndexPatternFieldEditorStart } from '../../../../../src/plugins/data_view_field_editor/public';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '../../../../../src/plugins/ui_actions/public';
import type { DataViewsPublicPluginStart } from '../../../../../src/plugins/data_views/public';

export type Props = Omit<DatasourceDataPanelProps<IndexPatternPrivateState>, 'core'> & {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  changeIndexPattern: (
    id: string,
    state: IndexPatternPrivateState,
    setState: StateSetter<IndexPatternPrivateState, { applyImmediately?: boolean }>
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
  'geo_point',
  'geo_shape',
]);

const fieldTypeNames: Record<DataType, string> = {
  document: i18n.translate('xpack.lens.datatypes.record', { defaultMessage: 'record' }),
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'number' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'date' }),
  ip: i18n.translate('xpack.lens.datatypes.ipAddress', { defaultMessage: 'IP' }),
  histogram: i18n.translate('xpack.lens.datatypes.histogram', { defaultMessage: 'histogram' }),
  geo_point: i18n.translate('xpack.lens.datatypes.geoPoint', { defaultMessage: 'geo_point' }),
  geo_shape: i18n.translate('xpack.lens.datatypes.geoShape', { defaultMessage: 'geo_shape' }),
};

// Wrapper around buildEsQuery, handling errors (e.g. because a query can't be parsed) by
// returning a query dsl object not matching anything
function buildSafeEsQuery(
  indexPattern: IndexPattern,
  query: Query,
  filters: Filter[],
  queryConfig: EsQueryConfig
) {
  try {
    return buildEsQuery(indexPattern, query, filters, queryConfig);
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
  dataViews,
  fieldFormats,
  query,
  filters,
  dateRange,
  changeIndexPattern,
  charts,
  indexPatternFieldEditor,
  showNoDataPopover,
  dropOntoWorkspace,
  hasSuggestionForField,
  uiActions,
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
    indexPatterns[currentIndexPatternId],
    query,
    filters,
    getEsQueryConfig(core.uiSettings)
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
              title={i18n.translate('xpack.lens.indexPattern.noDataViewsLabel', {
                defaultMessage: 'No data views',
              })}
              color="warning"
              iconType="alert"
            >
              <p>
                <FormattedMessage
                  id="xpack.lens.indexPattern.noDataViewDescription"
                  defaultMessage="Please create a data view or switch to another data source"
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
          dataViews={dataViews}
          fieldFormats={fieldFormats}
          charts={charts}
          indexPatternFieldEditor={indexPatternFieldEditor}
          onChangeIndexPattern={onChangeIndexPattern}
          onUpdateIndexPattern={onUpdateIndexPattern}
          existingFields={state.existingFields}
          existenceFetchFailed={state.existenceFetchFailed}
          existenceFetchTimeout={state.existenceFetchTimeout}
          dropOntoWorkspace={dropOntoWorkspace}
          hasSuggestionForField={hasSuggestionForField}
          uiActions={uiActions}
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
  defaultMessage: 'Filter by type',
});

const htmlId = htmlIdGenerator('datapanel');
const fieldSearchDescriptionId = htmlId();

export const InnerIndexPatternDataPanel = function InnerIndexPatternDataPanel({
  currentIndexPatternId,
  indexPatternRefs,
  indexPatterns,
  existenceFetchFailed,
  existenceFetchTimeout,
  query,
  dateRange,
  filters,
  dragDropContext,
  onChangeIndexPattern,
  onUpdateIndexPattern,
  core,
  data,
  dataViews,
  fieldFormats,
  indexPatternFieldEditor,
  existingFields,
  charts,
  dropOntoWorkspace,
  hasSuggestionForField,
  uiActions,
}: Omit<DatasourceDataPanelProps, 'state' | 'setState' | 'showNoDataPopover' | 'core'> & {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
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
  existenceFetchTimeout?: boolean;
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
  const visualizeGeoFieldTrigger = uiActions.getTrigger(VISUALIZE_GEO_FIELD_TRIGGER);
  const allFields = visualizeGeoFieldTrigger
    ? currentIndexPattern.fields
    : currentIndexPattern.fields.filter(({ type }) => type !== 'geo_point' && type !== 'geo_shape');
  const clearLocalState = () => setLocalState((s) => ({ ...s, nameFilter: '', typeFilter: [] }));
  const hasSyncedExistingFields = existingFields[currentIndexPattern.title];
  const availableFieldTypes = uniq(allFields.map(({ type }) => type)).filter(
    (type) => type in fieldTypeNames
  );

  const fieldInfoUnavailable =
    existenceFetchFailed || existenceFetchTimeout || currentIndexPattern.hasRestrictions;

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
    const groupedFields = {
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

    const isUsingSampling = core.uiSettings.get('lens:useFieldExistenceSampling');

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
        helpText: isUsingSampling
          ? i18n.translate('xpack.lens.indexPattern.allFieldsSamplingLabelHelp', {
              defaultMessage:
                'Available fields contain the data in the first 500 documents that match your filters. To view all fields, expand Empty fields. You are unable to create visualizations with full text, geographic, flattened, and object fields.',
            })
          : i18n.translate('xpack.lens.indexPattern.allFieldsLabelHelp', {
              defaultMessage:
                'Drag and drop available fields to the workspace and create visualizations. To change the available fields, select a different data view, edit your queries, or use a different time range. Some field types cannot be visualized in Lens, including full text and geographic fields.',
            }),
        isAffectedByGlobalFilter: !!filters.length,
        isAffectedByTimeFilter: true,
        // Show details on timeout but not failure
        hideDetails: fieldInfoUnavailable && !existenceFetchTimeout,
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
    core.uiSettings,
    fieldInfoUnavailable,
    filters.length,
    existenceFetchTimeout,
    currentIndexPattern,
    existingFields,
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
      indexPatternsService: dataViews,
      cache: {},
      patterns: [currentIndexPattern.id],
    });
    onUpdateIndexPattern(newlyMappedIndexPattern[currentIndexPattern.id]);
    // start a new session so all charts are refreshed
    data.search.session.start();
  }, [data, dataViews, currentIndexPattern, onUpdateIndexPattern]);

  const editField = useMemo(
    () =>
      editPermission
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            trackUiEvent(`open_field_editor_${uiAction}`);
            const indexPatternInstance = await dataViews.get(currentIndexPattern.id);
            closeFieldEditor.current = indexPatternFieldEditor.openEditor({
              ctx: {
                dataView: indexPatternInstance,
              },
              fieldName,
              onSave: async () => {
                trackUiEvent(`save_field_${uiAction}`);
                await refreshFieldList();
              },
            });
          }
        : undefined,
    [editPermission, dataViews, currentIndexPattern.id, indexPatternFieldEditor, refreshFieldList]
  );

  const removeField = useMemo(
    () =>
      editPermission
        ? async (fieldName: string) => {
            trackUiEvent('open_field_delete_modal');
            const indexPatternInstance = await dataViews.get(currentIndexPattern.id);
            closeFieldEditor.current = indexPatternFieldEditor.openDeleteModal({
              ctx: {
                dataView: indexPatternInstance,
              },
              fieldName,
              onDelete: async () => {
                trackUiEvent('delete_field');
                await refreshFieldList();
              },
            });
          }
        : undefined,
    [currentIndexPattern.id, dataViews, editPermission, indexPatternFieldEditor, refreshFieldList]
  );

  const addField = useMemo(
    () => (editPermission && editField ? () => editField(undefined, 'add') : undefined),
    [editField, editPermission]
  );

  const fieldProps = useMemo(
    () => ({
      core,
      data,
      fieldFormats,
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
      fieldFormats,
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
            responsive={false}
          >
            <EuiFlexItem grow={true} className="lnsInnerIndexPatternDataPanel__switcher">
              <ChangeIndexPattern
                data-test-subj="indexPattern-switcher"
                trigger={{
                  label: currentIndexPattern.name,
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
                        defaultMessage: 'Data view settings',
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
                          defaultMessage: 'Add field to data view',
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
                          defaultMessage: 'Manage data view fields',
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
                description: 'Search the list of fields in the data view for the provided text',
              })}
              value={localState.nameFilter}
              onChange={(e) => {
                setLocalState({ ...localState, nameFilter: e.target.value });
              }}
              aria-label={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                defaultMessage: 'Search field names',
                description: 'Search the list of fields in the data view for the provided text',
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
            existenceFetchTimeout={existenceFetchTimeout}
            existFieldsInIndex={!!allFields.length}
            dropOntoWorkspace={dropOntoWorkspace}
            hasSuggestionForField={hasSuggestionForField}
            editField={editField}
            removeField={removeField}
            uiActions={uiActions}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
};

export const MemoizedDataPanel = memo(InnerIndexPatternDataPanel);

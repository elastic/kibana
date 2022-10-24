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
  EuiFilterButton,
  EuiScreenReaderOnly,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EsQueryConfig, Query, Filter } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { htmlIdGenerator } from '@elastic/eui';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type {
  DatasourceDataPanelProps,
  DataType,
  FramePublicAPI,
  IndexPattern,
  IndexPatternField,
} from '../../types';
import { ChildDragDropProvider, DragContextState } from '../../drag_drop';
import type { FormBasedPrivateState } from './types';
import { Loader } from '../../loader';
import { LensFieldIcon } from '../../shared_components/field_picker/lens_field_icon';
import { getFieldType } from './pure_utils';
import { FieldGroups, FieldList } from './field_list';
import { fieldContainsData, fieldExists } from '../../shared_components';
import { IndexPatternServiceAPI } from '../../data_views_service/service';

export type Props = Omit<
  DatasourceDataPanelProps<FormBasedPrivateState>,
  'core' | 'onChangeIndexPattern'
> & {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginSetup;
  core: CoreStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  frame: FramePublicAPI;
  indexPatternService: IndexPatternServiceAPI;
  onIndexPatternRefresh: () => void;
  layerFields?: string[];
};

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
  'murmur3',
]);

const fieldTypeNames: Record<DataType, string> = {
  document: i18n.translate('xpack.lens.datatypes.record', { defaultMessage: 'Record' }),
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'Text string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'Number' }),
  gauge: i18n.translate('xpack.lens.datatypes.gauge', { defaultMessage: 'Gauge metric' }),
  counter: i18n.translate('xpack.lens.datatypes.counter', { defaultMessage: 'Counter metric' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'Boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'Date' }),
  ip: i18n.translate('xpack.lens.datatypes.ipAddress', { defaultMessage: 'IP address' }),
  histogram: i18n.translate('xpack.lens.datatypes.histogram', { defaultMessage: 'Histogram' }),
  geo_point: i18n.translate('xpack.lens.datatypes.geoPoint', {
    defaultMessage: 'Geographic point',
  }),
  geo_shape: i18n.translate('xpack.lens.datatypes.geoShape', {
    defaultMessage: 'Geographic shape',
  }),
  murmur3: i18n.translate('xpack.lens.datatypes.murmur3', { defaultMessage: 'murmur3' }),
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

export function FormBasedDataPanel({
  state,
  dragDropContext,
  core,
  data,
  dataViews,
  fieldFormats,
  query,
  filters,
  dateRange,
  charts,
  indexPatternFieldEditor,
  showNoDataPopover,
  dropOntoWorkspace,
  hasSuggestionForField,
  uiActions,
  indexPatternService,
  frame,
  onIndexPatternRefresh,
  usedIndexPatterns,
  layerFields,
}: Props) {
  const { indexPatterns, indexPatternRefs, existingFields, isFirstExistenceFetch } =
    frame.dataViews;
  const { currentIndexPatternId } = state;

  const indexPatternList = uniq(
    (
      usedIndexPatterns ?? Object.values(state.layers).map(({ indexPatternId }) => indexPatternId)
    ).concat(currentIndexPatternId)
  )
    .filter((id) => !!indexPatterns[id])
    .sort()
    .map((id) => indexPatterns[id]);

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
          indexPatternService.refreshExistingFields({
            dateRange,
            currentIndexPatternTitle: indexPatterns[currentIndexPatternId]?.title || '',
            onNoData: showNoDataPopover,
            dslQuery,
            indexPatternList,
            isFirstExistenceFetch,
            existingFields,
          })
        }
        loadDeps={[
          query,
          filters,
          dateRange.fromDate,
          dateRange.toDate,
          indexPatternList.map((x) => `${x.title}:${x.timeFieldName}`).join(','),
          // important here to rerun the fields existence on indexPattern change (i.e. add new fields in place)
          frame.dataViews.indexPatterns,
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
          dropOntoWorkspace={dropOntoWorkspace}
          hasSuggestionForField={hasSuggestionForField}
          uiActions={uiActions}
          indexPatternService={indexPatternService}
          onIndexPatternRefresh={onIndexPatternRefresh}
          frame={frame}
          layerFields={layerFields}
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

const htmlId = htmlIdGenerator('datapanel');
const fieldSearchDescriptionId = htmlId();

export const InnerFormBasedDataPanel = function InnerFormBasedDataPanel({
  currentIndexPatternId,
  query,
  dateRange,
  filters,
  dragDropContext,
  core,
  data,
  dataViews,
  fieldFormats,
  indexPatternFieldEditor,
  charts,
  dropOntoWorkspace,
  hasSuggestionForField,
  uiActions,
  indexPatternService,
  frame,
  onIndexPatternRefresh,
  layerFields,
}: Omit<
  DatasourceDataPanelProps,
  'state' | 'setState' | 'showNoDataPopover' | 'core' | 'onChangeIndexPattern' | 'usedIndexPatterns'
> & {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  core: CoreStart;
  currentIndexPatternId: string;
  dragDropContext: DragContextState;
  charts: ChartsPluginSetup;
  frame: FramePublicAPI;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  onIndexPatternRefresh: () => void;
  layerFields?: string[];
}) {
  const [localState, setLocalState] = useState<DataPanelState>({
    nameFilter: '',
    typeFilter: [],
    isTypeFilterOpen: false,
    isAvailableAccordionOpen: true,
    isEmptyAccordionOpen: false,
    isMetaAccordionOpen: false,
  });
  const { existenceFetchFailed, existenceFetchTimeout, indexPatterns, existingFields } =
    frame.dataViews;
  const currentIndexPattern = indexPatterns[currentIndexPatternId];
  const existingFieldsForIndexPattern = existingFields[currentIndexPattern?.title];
  const visualizeGeoFieldTrigger = uiActions.getTrigger(VISUALIZE_GEO_FIELD_TRIGGER);
  const allFields = useMemo(() => {
    if (!currentIndexPattern) return [];
    return visualizeGeoFieldTrigger
      ? currentIndexPattern.fields
      : currentIndexPattern.fields.filter(
          ({ type }) => type !== 'geo_point' && type !== 'geo_shape'
        );
  }, [currentIndexPattern, visualizeGeoFieldTrigger]);

  const clearLocalState = () => setLocalState((s) => ({ ...s, nameFilter: '', typeFilter: [] }));
  const availableFieldTypes = uniq([
    ...uniq(allFields.map(getFieldType)).filter((type) => type in fieldTypeNames),
    // always include current field type filters - there may not be any fields of the type of an existing type filter on data view switch, but we still need to include the existing filter in the list so that the user can remove it
    ...localState.typeFilter,
  ]);

  const fieldInfoUnavailable =
    existenceFetchFailed || existenceFetchTimeout || currentIndexPattern?.hasRestrictions;

  const editPermission =
    indexPatternFieldEditor.userPermissions.editIndexPattern() || !currentIndexPattern.isPersisted;

  const unfilteredFieldGroups: FieldGroups = useMemo(() => {
    const containsData = (field: IndexPatternField) => {
      const overallField = currentIndexPattern?.getFieldByName(field.name);
      return (
        overallField &&
        existingFieldsForIndexPattern &&
        fieldExists(existingFieldsForIndexPattern, overallField.name)
      );
    };

    const allSupportedTypesFields = allFields.filter((field) =>
      supportedFieldTypes.has(field.type)
    );
    const usedByLayersFields = allFields.filter((field) => layerFields?.includes(field.name));
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
      SelectedFields: {
        fields: usedByLayersFields,
        fieldCount: usedByLayersFields.length,
        isInitiallyOpen: true,
        showInAccordion: true,
        title: i18n.translate('xpack.lens.indexPattern.selectedFieldsLabel', {
          defaultMessage: 'Selected fields',
        }),
        isAffectedByGlobalFilter: !!filters.length,
        isAffectedByTimeFilter: true,
        hideDetails: false,
        hideIfEmpty: true,
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
    existingFieldsForIndexPattern,
    layerFields,
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
          return localState.typeFilter.includes(getFieldType(field) as DataType);
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
    (field: IndexPatternField) =>
      fieldContainsData(field.name, currentIndexPattern, existingFieldsForIndexPattern),
    [currentIndexPattern, existingFieldsForIndexPattern]
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
    if (currentIndexPattern) {
      const newlyMappedIndexPattern = await indexPatternService.loadIndexPatterns({
        patterns: [currentIndexPattern.id],
        cache: {},
        onIndexPatternRefresh,
      });
      indexPatternService.updateDataViewsState({
        indexPatterns: {
          ...frame.dataViews.indexPatterns,
          [currentIndexPattern.id]: newlyMappedIndexPattern[currentIndexPattern.id],
        },
      });
    }
    // start a new session so all charts are refreshed
    data.search.session.start();
  }, [
    indexPatternService,
    currentIndexPattern,
    onIndexPatternRefresh,
    frame.dataViews.indexPatterns,
    data.search.session,
  ]);

  const editField = useMemo(
    () =>
      editPermission
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            const indexPatternInstance = await dataViews.get(currentIndexPattern?.id);
            closeFieldEditor.current = indexPatternFieldEditor.openEditor({
              ctx: {
                dataView: indexPatternInstance,
              },
              fieldName,
              onSave: () => {
                if (indexPatternInstance.isPersisted()) {
                  refreshFieldList();
                } else {
                  indexPatternService.replaceDataViewId(indexPatternInstance);
                }
              },
            });
          }
        : undefined,
    [
      editPermission,
      dataViews,
      currentIndexPattern?.id,
      indexPatternFieldEditor,
      refreshFieldList,
      indexPatternService,
    ]
  );

  const removeField = useMemo(
    () =>
      editPermission
        ? async (fieldName: string) => {
            const indexPatternInstance = await dataViews.get(currentIndexPattern?.id);
            closeFieldEditor.current = indexPatternFieldEditor.openDeleteModal({
              ctx: {
                dataView: indexPatternInstance,
              },
              fieldName,
              onDelete: () => {
                if (indexPatternInstance.isPersisted()) {
                  refreshFieldList();
                } else {
                  indexPatternService.replaceDataViewId(indexPatternInstance);
                }
              },
            });
          }
        : undefined,
    [
      currentIndexPattern?.id,
      dataViews,
      editPermission,
      indexPatternFieldEditor,
      indexPatternService,
      refreshFieldList,
    ]
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

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiFlexGroup
        gutterSize="none"
        className="lnsInnerIndexPatternDataPanel"
        direction="column"
        responsive={false}
      >
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
                clearLocalState();
              },
            }}
            append={
              <EuiPopover
                id="dataPanelTypeFilter"
                panelClassName="euiFilterGroup__popoverPanel"
                panelPaddingSize="none"
                anchorPosition="rightUp"
                display="block"
                isOpen={localState.isTypeFilterOpen}
                closePopover={() =>
                  setLocalState(() => ({ ...localState, isTypeFilterOpen: false }))
                }
                button={
                  <EuiFilterButton
                    aria-label={i18n.translate('xpack.lens.indexPatterns.filterByTypeAriaLabel', {
                      defaultMessage: 'Filter by type',
                    })}
                    color="primary"
                    isSelected={localState.isTypeFilterOpen}
                    numFilters={localState.typeFilter.length}
                    hasActiveFilters={!!localState.typeFilter.length}
                    numActiveFilters={localState.typeFilter.length}
                    data-test-subj="lnsIndexPatternFiltersToggle"
                    className="lnsFilterButton"
                    onClick={() => {
                      setLocalState((s) => ({
                        ...s,
                        isTypeFilterOpen: !localState.isTypeFilterOpen,
                      }));
                    }}
                  >
                    <EuiIcon type="filter" />
                  </EuiFilterButton>
                }
              >
                <EuiContextMenuPanel
                  data-test-subj="lnsIndexPatternTypeFilterOptions"
                  items={(availableFieldTypes as DataType[]).map((type) => (
                    <EuiContextMenuItem
                      className="lnsInnerIndexPatternDataPanel__filterType"
                      key={type}
                      icon={localState.typeFilter.includes(type) ? 'check' : 'empty'}
                      data-test-subj={`typeFilter-${type}`}
                      onClick={() => {
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
            }
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
            hasSyncedExistingFields={!!existingFieldsForIndexPattern}
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

export const MemoizedDataPanel = memo(InnerFormBasedDataPanel);

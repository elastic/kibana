/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './datapanel.scss';
import { uniq } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiIcon,
  EuiPopover,
  EuiProgress,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { type DataView } from '@kbn/data-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  FieldsGroupNames,
  FieldListGrouped,
  type FieldListGroupedProps,
  useExistingFieldsFetcher,
  useGroupedFields,
  useExistingFieldsReader,
} from '@kbn/unified-field-list-plugin/public';
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
import { LensFieldIcon } from '../../shared_components/field_picker/lens_field_icon';
import { getFieldType } from './pure_utils';
import { fieldContainsData } from '../../shared_components';
import { IndexPatternServiceAPI } from '../../data_views_service/service';
import { FieldItem } from './field_item';

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

function onSupportedFieldFilter(field: IndexPatternField): boolean {
  return supportedFieldTypes.has(field.type);
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
  const { indexPatterns, indexPatternRefs } = frame.dataViews;
  const { currentIndexPatternId } = state;

  const activeIndexPatterns = useMemo(() => {
    return uniq(
      (
        usedIndexPatterns ?? Object.values(state.layers).map(({ indexPatternId }) => indexPatternId)
      ).concat(currentIndexPatternId)
    )
      .filter((id) => !!indexPatterns[id])
      .sort()
      .map((id) => indexPatterns[id]);
  }, [usedIndexPatterns, indexPatterns, state.layers, currentIndexPatternId]);

  return (
    <>
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
          showNoDataPopover={showNoDataPopover}
          activeIndexPatterns={activeIndexPatterns}
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
  showNoDataPopover,
  activeIndexPatterns,
}: Omit<
  DatasourceDataPanelProps,
  'state' | 'setState' | 'core' | 'onChangeIndexPattern' | 'usedIndexPatterns'
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
  activeIndexPatterns: IndexPattern[];
}) {
  const [localState, setLocalState] = useState<DataPanelState>({
    nameFilter: '',
    typeFilter: [],
    isTypeFilterOpen: false,
    isAvailableAccordionOpen: true,
    isEmptyAccordionOpen: false,
    isMetaAccordionOpen: false,
  });
  const { indexPatterns } = frame.dataViews;
  const currentIndexPattern = indexPatterns[currentIndexPatternId];

  const { refetchFieldsExistenceInfo, isProcessing } = useExistingFieldsFetcher({
    dataViews: activeIndexPatterns as unknown as DataView[],
    query,
    filters,
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
    services: {
      data,
      dataViews,
      core,
    },
    onNoData: (dataViewId) => {
      if (dataViewId === currentIndexPatternId) {
        showNoDataPopover();
      }
    },
  });
  const fieldsExistenceReader = useExistingFieldsReader();
  const fieldsExistenceStatus =
    fieldsExistenceReader.getFieldsExistenceStatus(currentIndexPatternId);

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

  const editPermission =
    indexPatternFieldEditor.userPermissions.editIndexPattern() || !currentIndexPattern.isPersisted;

  const onSelectedFieldFilter = useCallback(
    (field: IndexPatternField): boolean => {
      return Boolean(layerFields?.includes(field.name));
    },
    [layerFields]
  );

  const onFilterField = useCallback(
    (field: IndexPatternField) => {
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
    },
    [localState]
  );

  const hasFilters = Boolean(filters.length);
  const onOverrideFieldGroupDetails = useCallback(
    (groupName) => {
      if (groupName === FieldsGroupNames.AvailableFields) {
        const isUsingSampling = core.uiSettings.get('lens:useFieldExistenceSampling');

        return {
          helpText: isUsingSampling
            ? i18n.translate('xpack.lens.indexPattern.allFieldsSamplingLabelHelp', {
                defaultMessage:
                  'Available fields contain the data in the first 500 documents that match your filters. To view all fields, expand Empty fields. You are unable to create visualizations with full text, geographic, flattened, and object fields.',
              })
            : i18n.translate('xpack.lens.indexPattern.allFieldsLabelHelp', {
                defaultMessage:
                  'Drag and drop available fields to the workspace and create visualizations. To change the available fields, select a different data view, edit your queries, or use a different time range. Some field types cannot be visualized in Lens, including full text and geographic fields.',
              }),
          isAffectedByGlobalFilter: hasFilters,
        };
      }
      if (groupName === FieldsGroupNames.SelectedFields) {
        return {
          isAffectedByGlobalFilter: hasFilters,
        };
      }
    },
    [core.uiSettings, hasFilters]
  );

  const { fieldGroups } = useGroupedFields<IndexPatternField>({
    dataViewId: currentIndexPatternId,
    allFields,
    services: {
      dataViews,
    },
    fieldsExistenceReader,
    onFilterField,
    onSupportedFieldFilter,
    onSelectedFieldFilter,
    onOverrideFieldGroupDetails,
  });

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
                  refetchFieldsExistenceInfo(indexPatternInstance.id);
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
      refetchFieldsExistenceInfo,
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
                  refetchFieldsExistenceInfo(indexPatternInstance.id);
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
      refetchFieldsExistenceInfo,
    ]
  );

  const renderFieldItem: FieldListGroupedProps<IndexPatternField>['renderFieldItem'] = useCallback(
    ({ field, itemIndex, groupIndex, hideDetails }) => (
      <FieldItem
        field={field}
        exists={fieldContainsData(
          field.name,
          currentIndexPattern,
          fieldsExistenceReader.hasFieldData
        )}
        hideDetails={hideDetails || field.type === 'document'}
        itemIndex={itemIndex}
        groupIndex={groupIndex}
        dropOntoWorkspace={dropOntoWorkspace}
        hasSuggestionForField={hasSuggestionForField}
        editField={editField}
        removeField={removeField}
        uiActions={uiActions}
        core={core}
        fieldFormats={fieldFormats}
        indexPattern={currentIndexPattern}
        highlight={localState.nameFilter.toLowerCase()}
        dateRange={dateRange}
        query={query}
        filters={filters}
        chartsThemeService={charts.theme}
      />
    ),
    [
      core,
      fieldFormats,
      currentIndexPattern,
      dateRange,
      query,
      filters,
      localState.nameFilter,
      charts.theme,
      fieldsExistenceReader.hasFieldData,
      dropOntoWorkspace,
      hasSuggestionForField,
      editField,
      removeField,
      uiActions,
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
        {isProcessing && <EuiProgress size="xs" color="accent" position="absolute" />}
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
        <EuiFlexItem>
          <FieldListGrouped<IndexPatternField>
            fieldGroups={fieldGroups}
            fieldsExistenceStatus={fieldsExistenceStatus}
            fieldsExistInIndex={!!allFields.length}
            renderFieldItem={renderFieldItem}
            screenReaderDescriptionForSearchInputId={fieldSearchDescriptionId}
            data-test-subj="lnsIndexPattern"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
};

export const MemoizedDataPanel = memo(InnerFormBasedDataPanel);

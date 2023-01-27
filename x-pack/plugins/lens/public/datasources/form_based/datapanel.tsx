/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './datapanel.scss';
import { uniq } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
  FieldList,
  FieldListFilters,
  FieldListGrouped,
  type FieldListGroupedProps,
  FieldsGroupNames,
  useExistingFieldsFetcher,
  useGroupedFields,
} from '@kbn/unified-field-list-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type {
  DatasourceDataPanelProps,
  FramePublicAPI,
  IndexPattern,
  IndexPatternField,
} from '../../types';
import { ChildDragDropProvider, DragContextState } from '../../drag_drop';
import type { FormBasedPrivateState } from './types';
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

  const visualizeGeoFieldTrigger = uiActions.getTrigger(VISUALIZE_GEO_FIELD_TRIGGER);
  const allFields = useMemo(() => {
    if (!currentIndexPattern) return [];
    return visualizeGeoFieldTrigger
      ? currentIndexPattern.fields
      : currentIndexPattern.fields.filter(
          ({ type }) => type !== 'geo_point' && type !== 'geo_shape'
        );
  }, [currentIndexPattern, visualizeGeoFieldTrigger]);

  const editPermission =
    indexPatternFieldEditor.userPermissions.editIndexPattern() || !currentIndexPattern.isPersisted;

  const onSelectedFieldFilter = useCallback(
    (field: IndexPatternField): boolean => {
      return Boolean(layerFields?.includes(field.name));
    },
    [layerFields]
  );

  const onOverrideFieldGroupDetails = useCallback((groupName) => {
    if (groupName === FieldsGroupNames.AvailableFields) {
      return {
        helpText: i18n.translate('xpack.lens.indexPattern.allFieldsLabelHelp', {
          defaultMessage:
            'Drag and drop available fields to the workspace and create visualizations. To change the available fields, select a different data view, edit your queries, or use a different time range. Some field types cannot be visualized in Lens, including full text and geographic fields.',
        }),
      };
    }
  }, []);

  const { fieldListFiltersProps, fieldListGroupedProps } = useGroupedFields<IndexPatternField>({
    dataViewId: currentIndexPatternId,
    allFields,
    services: {
      dataViews,
      core,
    },
    isAffectedByGlobalFilter: Boolean(filters.length),
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
            const indexPatternInstance = await dataViews.get(currentIndexPattern?.id, false);
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
    ({ field, itemIndex, groupIndex, groupName, hideDetails, fieldSearchHighlight }) => (
      <FieldItem
        field={field}
        exists={groupName !== FieldsGroupNames.EmptyFields}
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
        highlight={fieldSearchHighlight}
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
      charts.theme,
      dropOntoWorkspace,
      hasSuggestionForField,
      editField,
      removeField,
      uiActions,
    ]
  );

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <FieldList
        className="lnsInnerIndexPatternDataPanel"
        isProcessing={isProcessing}
        prepend={<FieldListFilters {...fieldListFiltersProps} data-test-subj="lnsIndexPattern" />}
      >
        <FieldListGrouped<IndexPatternField>
          {...fieldListGroupedProps}
          renderFieldItem={renderFieldItem}
          data-test-subj="lnsIndexPattern"
          localStorageKeyPrefix="lens"
        />
      </FieldList>
    </ChildDragDropProvider>
  );
};

export const MemoizedDataPanel = memo(InnerFormBasedDataPanel);

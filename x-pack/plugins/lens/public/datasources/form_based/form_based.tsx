/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart, SavedObjectReference } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { flatten, isEqual } from 'lodash';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DataPublicPluginStart, ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { EuiButton } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type {
  DatasourceDimensionEditorProps,
  DatasourceDimensionTriggerProps,
  DatasourceDataPanelProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  OperationDescriptor,
  FramePublicAPI,
  IndexPatternField,
  IndexPattern,
  IndexPatternRef,
  DatasourceLayerSettingsProps,
  DataSourceInfo,
  UserMessage,
  FrameDatasourceAPI,
  StateSetter,
} from '../../types';
import {
  changeIndexPattern,
  changeLayerIndexPattern,
  extractReferences,
  injectReferences,
  loadInitialState,
  onRefreshIndexPattern,
  renameIndexPattern,
  triggerActionOnIndexPatternChange,
} from './loader';
import { toExpression } from './to_expression';
import { FormBasedDimensionEditor, getDropProps, onDrop } from './dimension_panel';
import { FormBasedDataPanel } from './datapanel';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
  getDatasourceSuggestionsForVisualizeField,
  getDatasourceSuggestionsForVisualizeCharts,
} from './form_based_suggestions';

import {
  getFiltersInLayer,
  getShardFailuresWarningMessages,
  getVisualDefaultsForLayer,
  getDeprecatedSamplingWarningMessage,
  isColumnInvalid,
  cloneLayer,
} from './utils';
import { isDraggedDataViewField } from '../../utils';
import { hasField, normalizeOperationDataType } from './pure_utils';
import { LayerPanel } from './layerpanel';
import {
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  getCurrentFieldsForOperation,
  getErrorMessages,
  insertNewColumn,
  operationDefinitionMap,
  TermsIndexPatternColumn,
} from './operations';
import {
  copyColumn,
  getColumnOrder,
  getReferenceRoot,
  reorderByGroups,
} from './operations/layer_helpers';
import { FormBasedPrivateState, FormBasedPersistedState, DataViewDragDropOperation } from './types';
import { mergeLayer, mergeLayers } from './state_helpers';
import type { Datasource, VisualizeEditorContext } from '../../types';
import { deleteColumn, isReferenced } from './operations';
import { GeoFieldWorkspacePanel } from '../../editor_frame_service/editor_frame/workspace_panel/geo_field_workspace_panel';
import type { DraggingIdentifier } from '../../drag_drop';
import { getStateTimeShiftWarningMessages } from './time_shift_utils';
import { getPrecisionErrorWarningMessages } from './utils';
import { DOCUMENT_FIELD_NAME } from '../../../common/constants';
import { isColumnOfType } from './operations/definitions/helpers';
import { LayerSettingsPanel } from './layer_settings';
import { FormBasedLayer } from '../..';
import { DimensionTrigger } from '../../shared_components/dimension_trigger';
export type { OperationType, GenericIndexPatternColumn } from './operations';
export { deleteColumn } from './operations';

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
}

export function columnToOperation(
  column: GenericIndexPatternColumn,
  uniqueLabel?: string,
  dataView?: IndexPattern | DataView
): OperationDescriptor {
  const { dataType, label, isBucketed, scale, operationType, timeShift, reducedTimeRange } = column;
  const fieldTypes =
    'sourceField' in column ? dataView?.getFieldByName(column.sourceField)?.esTypes : undefined;
  return {
    dataType: normalizeOperationDataType(dataType),
    isBucketed,
    scale,
    label: uniqueLabel || label,
    isStaticValue: operationType === 'static_value',
    sortingHint:
      column.dataType === 'string' && fieldTypes?.includes(ES_FIELD_TYPES.VERSION)
        ? 'version'
        : undefined,
    hasTimeShift: Boolean(timeShift),
    hasReducedTimeRange: Boolean(reducedTimeRange),
    interval: isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column)
      ? column.params.interval
      : undefined,
  };
}

export type { FormatColumnArgs, TimeScaleArgs, CounterRateArgs } from '../../../common/expressions';

export {
  getSuffixFormatter,
  unitSuffixesLong,
  suffixFormatterId,
} from '../../../common/suffix_formatter';

export function getFormBasedDatasource({
  core,
  storage,
  data,
  unifiedSearch,
  share,
  dataViews,
  fieldFormats,
  charts,
  dataViewFieldEditor,
  uiActions,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  share?: SharePluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginSetup;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  uiActions: UiActionsStart;
}) {
  const uiSettings = core.uiSettings;

  const DATASOURCE_ID = 'formBased';

  // Not stateful. State is persisted to the frame
  const formBasedDatasource: Datasource<FormBasedPrivateState, FormBasedPersistedState> = {
    id: DATASOURCE_ID,

    initialize(
      persistedState?: FormBasedPersistedState,
      references?: SavedObjectReference[],
      initialContext?: VisualizeFieldContext | VisualizeEditorContext,
      indexPatternRefs?: IndexPatternRef[],
      indexPatterns?: Record<string, IndexPattern>
    ) {
      return loadInitialState({
        persistedState,
        references,
        defaultIndexPatternId: core.uiSettings.get('defaultIndex'),
        storage,
        initialContext,
        indexPatternRefs,
        indexPatterns,
      });
    },

    getPersistableState(state: FormBasedPrivateState) {
      return extractReferences(state);
    },

    insertLayer(
      state: FormBasedPrivateState,
      newLayerId: string,
      linkToLayers: string[] | undefined
    ) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: blankLayer(state.currentIndexPatternId, linkToLayers),
        },
      };
    },

    createEmptyLayer(indexPatternId: string) {
      return {
        currentIndexPatternId: indexPatternId,
        layers: {},
      };
    },

    cloneLayer(state, layerId, newLayerId, getNewId) {
      return {
        ...state,
        layers: cloneLayer(state.layers, layerId, newLayerId, getNewId),
      };
    },

    removeLayer(state: FormBasedPrivateState, layerId: string) {
      const newLayers = { ...state.layers };
      delete newLayers[layerId];
      const removedLayerIds: string[] = [layerId];

      // delete layers linked to this layer
      Object.keys(newLayers).forEach((id) => {
        const linkedLayers = newLayers[id]?.linkToLayers;
        if (linkedLayers && linkedLayers.includes(layerId)) {
          delete newLayers[id];
          removedLayerIds.push(id);
        }
      });

      return {
        removedLayerIds,
        newState: {
          ...state,
          layers: newLayers,
        },
      };
    },

    clearLayer(state: FormBasedPrivateState, layerId: string) {
      const newLayers = { ...state.layers };

      const removedLayerIds: string[] = [];
      // delete layers linked to this layer
      Object.keys(newLayers).forEach((id) => {
        const linkedLayers = newLayers[id]?.linkToLayers;
        if (linkedLayers && linkedLayers.includes(layerId)) {
          delete newLayers[id];
          removedLayerIds.push(id);
        }
      });

      return {
        removedLayerIds,
        newState: {
          ...state,
          layers: {
            ...newLayers,
            [layerId]: blankLayer(state.currentIndexPatternId, state.layers[layerId]?.linkToLayers),
          },
        },
      };
    },

    getLayers(state: FormBasedPrivateState) {
      return Object.keys(state?.layers);
    },

    removeColumn({ prevState, layerId, columnId, indexPatterns }) {
      const indexPattern = indexPatterns[prevState.layers[layerId]?.indexPatternId];
      return mergeLayer({
        state: prevState,
        layerId,
        newLayer: deleteColumn({
          layer: prevState.layers[layerId],
          columnId,
          indexPattern,
        }),
      });
    },

    initializeDimension(
      state,
      layerId,
      indexPatterns,
      { columnId, groupId, staticValue, autoTimeField, visualizationGroups }
    ) {
      const indexPattern = indexPatterns[state.layers[layerId]?.indexPatternId];
      let ret = state;

      if (staticValue != null) {
        ret = mergeLayer({
          state,
          layerId,
          newLayer: insertNewColumn({
            layer: state.layers[layerId],
            op: 'static_value',
            columnId,
            field: undefined,
            indexPattern,
            visualizationGroups,
            initialParams: { params: { value: staticValue } },
            targetGroup: groupId,
          }),
        });
      }

      if (autoTimeField && indexPattern.timeFieldName) {
        ret = mergeLayer({
          state,
          layerId,
          newLayer: insertNewColumn({
            layer: state.layers[layerId],
            op: 'date_histogram',
            columnId,
            field: indexPattern.fields.find((field) => field.name === indexPattern.timeFieldName),
            indexPattern,
            visualizationGroups,
            targetGroup: groupId,
          }),
        });
      }

      return ret;
    },

    syncColumns({ state, links, indexPatterns, getDimensionGroups }) {
      let modifiedLayers: Record<string, FormBasedLayer> = state.layers;

      links.forEach((link) => {
        const source: DataViewDragDropOperation = {
          ...link.from,
          dataView: indexPatterns[modifiedLayers[link.from.layerId]?.indexPatternId],
          filterOperations: () => true,
        };

        const target: DataViewDragDropOperation = {
          ...link.to,
          dataView: indexPatterns[modifiedLayers[link.to.layerId]?.indexPatternId],
          filterOperations: () => true,
        };

        modifiedLayers = copyColumn({
          layers: modifiedLayers,
          target,
          source,
        });

        const updatedColumnOrder = reorderByGroups(
          getDimensionGroups(target.layerId),
          getColumnOrder(modifiedLayers[target.layerId]),
          target.groupId,
          target.columnId
        );

        modifiedLayers = {
          ...modifiedLayers,
          [target.layerId]: {
            ...modifiedLayers[target.layerId],
            columnOrder: updatedColumnOrder,
            columns: modifiedLayers[target.layerId].columns,
          },
        };
      });

      const newState = mergeLayers({
        state,
        newLayers: modifiedLayers,
      });

      links
        .filter((link) =>
          isColumnOfType<TermsIndexPatternColumn>(
            'terms',
            newState.layers[link.from.layerId].columns[link.from.columnId]
          )
        )
        .forEach(({ from, to }) => {
          const fromColumn = newState.layers[from.layerId].columns[
            from.columnId
          ] as TermsIndexPatternColumn;
          if (fromColumn.params.orderBy.type === 'column') {
            const fromOrderByColumnId = fromColumn.params.orderBy.columnId;
            const orderByColumnLink = links.find(
              ({ from: { columnId } }) => columnId === fromOrderByColumnId
            );

            if (orderByColumnLink) {
              // order the synced column by the dimension which is linked to the column that the original column was ordered by
              const toColumn = newState.layers[to.layerId].columns[
                to.columnId
              ] as TermsIndexPatternColumn;
              toColumn.params.orderBy = { type: 'column', columnId: orderByColumnLink.to.columnId };
            }
          }
        });

      return newState;
    },

    getSelectedFields(state) {
      const fields: string[] = [];
      Object.values(state?.layers)?.forEach((l) => {
        const { columns } = l;
        Object.values(columns).forEach((c) => {
          if (operationDefinitionMap[c.operationType]?.getCurrentFields) {
            fields.push(...(operationDefinitionMap[c.operationType]?.getCurrentFields?.(c) || []));
          } else if ('sourceField' in c) {
            fields.push(c.sourceField);
          }
        });
      });
      return fields;
    },

    toExpression: (state, layerId, indexPatterns, dateRange, searchSessionId) =>
      toExpression(state, layerId, indexPatterns, uiSettings, dateRange, searchSessionId),

    renderLayerSettings(
      domElement: Element,
      props: DatasourceLayerSettingsProps<FormBasedPrivateState>
    ) {
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <KibanaContextProvider
              services={{
                ...core,
                data,
                dataViews,
                fieldFormats,
                charts,
                unifiedSearch,
                share,
              }}
            >
              <LayerSettingsPanel {...props} />
            </KibanaContextProvider>
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    renderDataPanel(domElement: Element, props: DatasourceDataPanelProps<FormBasedPrivateState>) {
      const { onChangeIndexPattern, ...otherProps } = props;
      const layerFields = formBasedDatasource?.getSelectedFields?.(props.state);

      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <KibanaContextProvider
              services={{
                ...core,
                data,
                dataViews,
                fieldFormats,
                charts,
                unifiedSearch,
                share,
              }}
            >
              <FormBasedDataPanel
                data={data}
                dataViews={dataViews}
                fieldFormats={fieldFormats}
                charts={charts}
                indexPatternFieldEditor={dataViewFieldEditor}
                {...otherProps}
                core={core}
                uiActions={uiActions}
                onIndexPatternRefresh={onRefreshIndexPattern}
                layerFields={layerFields}
              />
            </KibanaContextProvider>
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    uniqueLabels(state: FormBasedPrivateState) {
      const layers = state.layers;
      const columnLabelMap = {} as Record<string, string>;
      const counts = {} as Record<string, number>;

      const makeUnique = (label: string) => {
        let uniqueLabel = label;

        while (counts[uniqueLabel] >= 0) {
          const num = ++counts[uniqueLabel];
          uniqueLabel = i18n.translate('xpack.lens.indexPattern.uniqueLabel', {
            defaultMessage: '{label} [{num}]',
            values: { label, num },
          });
        }

        counts[uniqueLabel] = 0;
        return uniqueLabel;
      };
      Object.values(layers).forEach((layer) => {
        if (!layer.columns) {
          return;
        }
        Object.entries(layer.columns).forEach(([columnId, column]) => {
          columnLabelMap[columnId] = makeUnique(column.label);
        });
      });

      return columnLabelMap;
    },

    isValidColumn: (state, indexPatterns, layerId, columnId, dateRange) => {
      const layer = state.layers[layerId];

      return !isColumnInvalid(layer, columnId, indexPatterns[layer.indexPatternId], dateRange);
    },

    renderDimensionTrigger: (
      domElement: Element,
      props: DatasourceDimensionTriggerProps<FormBasedPrivateState>
    ) => {
      const columnLabelMap = formBasedDatasource.uniqueLabels(props.state);
      const uniqueLabel = columnLabelMap[props.columnId];
      const formattedLabel = wrapOnDot(uniqueLabel);

      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <KibanaContextProvider
              services={{
                appName: 'lens',
                storage,
                uiSettings,
                data,
                fieldFormats,
                savedObjects: core.savedObjects,
                docLinks: core.docLinks,
                unifiedSearch,
              }}
            >
              <DimensionTrigger
                id={props.columnId}
                label={formattedLabel}
                isInvalid={props.invalid}
                hideTooltip={props.hideTooltip}
                invalidMessage={props.invalidMessage}
              />
            </KibanaContextProvider>
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    renderDimensionEditor: (
      domElement: Element,
      props: DatasourceDimensionEditorProps<FormBasedPrivateState>
    ) => {
      const columnLabelMap = formBasedDatasource.uniqueLabels(props.state);

      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <KibanaContextProvider
              services={{
                appName: 'lens',
                storage,
                uiSettings,
                data,
                fieldFormats,
                savedObjects: core.savedObjects,
                docLinks: core.docLinks,
                http: core.http,
                unifiedSearch,
              }}
            >
              <FormBasedDimensionEditor
                uiSettings={uiSettings}
                storage={storage}
                fieldFormats={fieldFormats}
                savedObjectsClient={core.savedObjects.client}
                http={core.http}
                data={data}
                unifiedSearch={unifiedSearch}
                dataViews={dataViews}
                uniqueLabel={columnLabelMap[props.columnId]}
                {...props}
              />
            </KibanaContextProvider>
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    renderLayerPanel: (
      domElement: Element,
      props: DatasourceLayerPanelProps<FormBasedPrivateState>
    ) => {
      const { onChangeIndexPattern, ...otherProps } = props;
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <LayerPanel
            onChangeIndexPattern={(indexPatternId) => {
              triggerActionOnIndexPatternChange({
                indexPatternId,
                state: props.state,
                layerId: props.layerId,
                uiActions,
              });
              onChangeIndexPattern(indexPatternId, DATASOURCE_ID, props.layerId);
            }}
            {...otherProps}
          />
        </KibanaThemeProvider>,
        domElement
      );
    },

    canCloseDimensionEditor: (state) => {
      return !state.isDimensionClosePrevented;
    },

    getDropProps,
    onDrop,

    getCustomWorkspaceRenderer: (
      state: FormBasedPrivateState,
      dragging: DraggingIdentifier,
      indexPatterns: Record<string, IndexPattern>
    ) => {
      if (dragging.field === undefined || dragging.indexPatternId === undefined) {
        return undefined;
      }

      const indexPattern = indexPatterns[dragging.indexPatternId as string];
      const draggedField = dragging as DraggingIdentifier & {
        field: IndexPatternField;
        indexPatternId: string;
      };
      const geoFieldType =
        draggedField.field.esTypes &&
        draggedField.field.esTypes.find((esType) => {
          return ['geo_point', 'geo_shape'].includes(esType);
        });
      return geoFieldType
        ? () => {
            return (
              <GeoFieldWorkspacePanel
                uiActions={uiActions}
                fieldType={geoFieldType}
                indexPattern={indexPattern}
                fieldName={draggedField.field.name}
              />
            );
          }
        : undefined;
    },

    updateCurrentIndexPatternId: ({ state, indexPatternId, setState }) => {
      setState({
        ...state,
        currentIndexPatternId: indexPatternId,
      });
    },

    onRefreshIndexPattern,
    onIndexPatternChange(state, indexPatterns, indexPatternId, layerId) {
      if (layerId) {
        const layersToChange = [
          layerId,
          ...Object.entries(state.layers)
            .map(([possiblyLinkedId, layer]) =>
              layer.linkToLayers?.includes(layerId) ? possiblyLinkedId : ''
            )
            .filter(Boolean),
        ];

        return changeLayerIndexPattern({
          indexPatternId,
          layerIds: layersToChange,
          state,
          replaceIfPossible: true,
          storage,
          indexPatterns,
        });
      }
      return changeIndexPattern({ indexPatternId, state, storage, indexPatterns });
    },
    onIndexPatternRename: (state, oldIndexPatternId, newIndexPatternId) => {
      return renameIndexPattern({ state, oldIndexPatternId, newIndexPatternId });
    },
    getRenderEventCounters(state: FormBasedPrivateState): string[] {
      const additionalEvents = {
        time_shift: false,
        filter: false,
      };
      const operations = flatten(
        Object.values(state?.layers ?? {}).map((l) =>
          Object.values(l.columns).map((c) => {
            if (c.timeShift) {
              additionalEvents.time_shift = true;
            }
            if (c.filter) {
              additionalEvents.filter = true;
            }
            return c.operationType;
          })
        )
      );

      return [
        ...operations,
        ...Object.entries(additionalEvents).reduce<string[]>((acc, [key, isActive]) => {
          if (isActive) {
            acc.push(key);
          }
          return acc;
        }, []),
      ].map((item) => `dimension_${item}`);
    },

    // Reset the temporary invalid state when closing the editor, but don't
    // update the state if it's not needed
    updateStateOnCloseDimension: ({ state, layerId }) => {
      const layer = state.layers[layerId];
      if (!Object.values(layer.incompleteColumns || {}).length) {
        return;
      }
      return mergeLayer({
        state,
        layerId,
        newLayer: { ...layer, incompleteColumns: undefined },
      });
    },

    getPublicAPI({ state, layerId, indexPatterns }: PublicAPIProps<FormBasedPrivateState>) {
      const columnLabelMap = formBasedDatasource.uniqueLabels(state);
      const layer = state.layers[layerId];
      const visibleColumnIds = layer.columnOrder.filter((colId) => !isReferenced(layer, colId));

      return {
        datasourceId: DATASOURCE_ID,
        getTableSpec: () => {
          // consider also referenced columns in this case
          // but map fields to the top referencing column
          const fieldsPerColumn: Record<string, string[]> = {};
          Object.keys(layer.columns).forEach((colId) => {
            const visibleColumnId = getReferenceRoot(layer, colId);
            fieldsPerColumn[visibleColumnId] = fieldsPerColumn[visibleColumnId] || [];

            const column = layer.columns[colId];
            if (isColumnOfType<TermsIndexPatternColumn>('terms', column)) {
              fieldsPerColumn[visibleColumnId].push(
                ...[column.sourceField].concat(column.params.secondaryFields ?? [])
              );
            }
            if ('sourceField' in column && column.sourceField !== DOCUMENT_FIELD_NAME) {
              fieldsPerColumn[visibleColumnId].push(column.sourceField);
            }
          });
          return visibleColumnIds.map((colId, i) => ({
            columnId: colId,
            fields: [...new Set(fieldsPerColumn[colId] || [])],
          }));
        },
        isTextBasedLanguage: () => false,
        getOperationForColumnId: (columnId: string) => {
          if (layer && layer.columns[columnId]) {
            if (!isReferenced(layer, columnId)) {
              return columnToOperation(
                layer.columns[columnId],
                columnLabelMap[columnId],
                indexPatterns[layer.indexPatternId]
              );
            }
          }
          return null;
        },
        getSourceId: () => {
          return layer.indexPatternId;
        },
        getFilters: (activeData: FramePublicAPI['activeData'], timeRange?: TimeRange) => {
          return getFiltersInLayer(
            layer,
            visibleColumnIds,
            activeData?.[layerId],
            indexPatterns[layer.indexPatternId],
            timeRange
          );
        },
        getVisualDefaults: () => getVisualDefaultsForLayer(layer),
        getMaxPossibleNumValues: (columnId) => {
          if (layer && layer.columns[columnId]) {
            const column = layer.columns[columnId];
            return (
              operationDefinitionMap[column.operationType].getMaxPossibleNumValues?.(column) ?? null
            );
          }
          return null;
        },
        hasDefaultTimeField: () => Boolean(indexPatterns[layer.indexPatternId].timeFieldName),
      };
    },
    getDatasourceSuggestionsForField(state, draggedField, filterLayers, indexPatterns) {
      return isDraggedDataViewField(draggedField)
        ? getDatasourceSuggestionsForField(
            state,
            draggedField.indexPatternId,
            draggedField.field,
            indexPatterns,
            filterLayers
          )
        : [];
    },
    getDatasourceSuggestionsFromCurrentState,
    getDatasourceSuggestionsForVisualizeField,
    getDatasourceSuggestionsForVisualizeCharts,

    getUserMessages(state, { frame: frameDatasourceAPI, setState }) {
      if (!state) {
        return [];
      }

      const layerErrorMessages = getLayerErrorMessages(
        state,
        frameDatasourceAPI,
        setState,
        core,
        data
      );

      const dimensionErrorMessages = getDimensionErrorMessages(state, (layerId, columnId) =>
        this.isValidColumn(state, frameDatasourceAPI.dataViews.indexPatterns, layerId, columnId)
      );

      const warningMessages = [
        ...[
          ...(getStateTimeShiftWarningMessages(
            data.datatableUtilities,
            state,
            frameDatasourceAPI
          ) || []),
          ...getPrecisionErrorWarningMessages(
            data.datatableUtilities,
            state,
            frameDatasourceAPI,
            core.docLinks,
            setState
          ),
        ].map((longMessage) => {
          const message: UserMessage = {
            severity: 'warning',
            fixableInEditor: true,
            displayLocations: [{ id: 'toolbar' }],
            shortMessage: '',
            longMessage,
          };

          return message;
        }),
        ...getDeprecatedSamplingWarningMessage(core),
      ];

      return [...layerErrorMessages, ...dimensionErrorMessages, ...warningMessages];
    },

    getSearchWarningMessages: (state, warning, request, response) => {
      return [...getShardFailuresWarningMessages(state, warning, request, response, core.theme)];
    },

    checkIntegrity: (state, indexPatterns) => {
      const ids = Object.values(state.layers || {}).map(({ indexPatternId }) => indexPatternId);
      return ids.filter((id) => !indexPatterns[id]);
    },
    isTimeBased: (state, indexPatterns) => {
      if (!state) return false;
      const { layers } = state;
      return (
        Boolean(layers) &&
        Object.values(layers).some((layer) => {
          return (
            Boolean(indexPatterns[layer.indexPatternId]?.timeFieldName) ||
            layer.columnOrder
              .filter((colId) => layer.columns[colId].isBucketed)
              .some((colId) => {
                const column = layer.columns[colId];
                return (
                  isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column) &&
                  !column.params.ignoreTimeRange
                );
              })
          );
        })
      );
    },
    isEqual: (
      persistableState1: FormBasedPersistedState,
      references1: SavedObjectReference[],
      persistableState2: FormBasedPersistedState,
      references2: SavedObjectReference[]
    ) =>
      isEqual(
        injectReferences(persistableState1, references1),
        injectReferences(persistableState2, references2)
      ),
    getUsedDataView: (state: FormBasedPrivateState, layerId?: string) => {
      if (!layerId) {
        return state.currentIndexPatternId;
      }
      return state.layers[layerId].indexPatternId;
    },
    getUsedDataViews: (state) => {
      return Object.values(state.layers).map(({ indexPatternId }) => indexPatternId);
    },

    getDatasourceInfo: async (state, references, dataViewsService) => {
      const layers = references ? injectReferences(state, references).layers : state.layers;
      const indexPatterns: DataView[] = [];
      for (const { indexPatternId } of Object.values(layers)) {
        const dataView = await dataViewsService?.get(indexPatternId);
        if (dataView) {
          indexPatterns.push(dataView);
        }
      }
      return Object.entries(layers).reduce<DataSourceInfo[]>((acc, [key, layer]) => {
        const dataView = indexPatterns?.find(
          (indexPattern) => indexPattern.id === layer.indexPatternId
        );

        const columns = Object.entries(layer.columns).map(([colId, col]) => {
          const fields = hasField(col) ? getCurrentFieldsForOperation(col) : undefined;
          return {
            id: colId,
            role: col.isBucketed ? ('split' as const) : ('metric' as const),
            operation: {
              ...columnToOperation(col, undefined, dataView),
              type: col.operationType,
              fields,
              filter: col.filter,
            },
          };
        });

        acc.push({
          layerId: key,
          columns,
          dataView,
        });

        return acc;
      }, []);
    },
  };

  return formBasedDatasource;
}

function blankLayer(indexPatternId: string, linkToLayers?: string[]): FormBasedLayer {
  return {
    indexPatternId,
    linkToLayers,
    columns: {},
    columnOrder: [],
    sampling: 1,
  };
}

function getLayerErrorMessages(
  state: FormBasedPrivateState,
  frameDatasourceAPI: FrameDatasourceAPI,
  setState: StateSetter<FormBasedPrivateState, unknown>,
  core: CoreStart,
  data: DataPublicPluginStart
) {
  const indexPatterns = frameDatasourceAPI.dataViews.indexPatterns;

  const layerErrors: UserMessage[][] = Object.entries(state.layers)
    .filter(([_, layer]) => !!indexPatterns[layer.indexPatternId])
    .map(([layerId, layer]) =>
      (
        getErrorMessages(layer, indexPatterns[layer.indexPatternId], state, layerId, core, data) ??
        []
      ).map((error) => {
        const message: UserMessage = {
          severity: 'error',
          fixableInEditor: true,
          displayLocations: [{ id: 'visualization' }],
          shortMessage: '',
          longMessage:
            typeof error === 'string' ? (
              error
            ) : (
              <>
                {error.message}
                {error.fixAction && (
                  <EuiButton
                    data-test-subj="errorFixAction"
                    onClick={async () => {
                      const newState = await error.fixAction?.newState(frameDatasourceAPI);
                      if (newState) {
                        setState(newState);
                      }
                    }}
                  >
                    {error.fixAction?.label}
                  </EuiButton>
                )}
              </>
            ),
        };

        return message;
      })
    );

  let errorMessages: UserMessage[];
  if (layerErrors.length <= 1) {
    // Single layer case, no need to explain more
    errorMessages = layerErrors[0]?.length ? layerErrors[0] : [];
  } else {
    // For multiple layers we will prepend each error with the layer number
    errorMessages = layerErrors.flatMap((errors, index) => {
      return errors.map((error) => {
        const message: UserMessage = {
          ...error,
          shortMessage: i18n.translate('xpack.lens.indexPattern.layerErrorWrapper', {
            defaultMessage: 'Layer {position} error: {wrappedMessage}',
            values: {
              position: index + 1,
              wrappedMessage: error.shortMessage,
            },
          }),
          longMessage: (
            <FormattedMessage
              id="xpack.lens.indexPattern.layerErrorWrapper"
              defaultMessage="Layer {position} error: {wrappedMessage}"
              values={{
                position: index + 1,
                wrappedMessage: <>{error.longMessage}</>,
              }}
            />
          ),
        };

        return message;
      });
    });
  }

  return errorMessages;
}

function getDimensionErrorMessages(
  state: FormBasedPrivateState,
  isValidColumn: (layerId: string, columnId: string) => boolean
) {
  // generate messages for invalid columns
  const columnErrorMessages: UserMessage[] = Object.keys(state.layers)
    .map((layerId) => {
      const messages: UserMessage[] = [];
      for (const columnId of Object.keys(state.layers[layerId].columns)) {
        if (!isValidColumn(layerId, columnId)) {
          messages.push({
            severity: 'error',
            displayLocations: [{ id: 'dimensionTrigger', dimensionId: columnId, layerId }],
            fixableInEditor: true,
            shortMessage: '',
            longMessage: (
              <p>
                {i18n.translate('xpack.lens.configure.invalidConfigTooltip', {
                  defaultMessage: 'Invalid configuration.',
                })}
                <br />
                {i18n.translate('xpack.lens.configure.invalidConfigTooltipClick', {
                  defaultMessage: 'Click for more details.',
                })}
              </p>
            ),
          });
        }
      }

      return messages;
    })
    .flat();

  return columnErrorMessages;
}

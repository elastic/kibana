/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart, SavedObjectReference } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import type { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import type { FieldFormatsStart } from 'src/plugins/field_formats/public';
import { isEqual } from 'lodash';
import type { DataViewsPublicPluginStart } from '../../../../../src/plugins/data_views/public';
import type { IndexPatternFieldEditorStart } from '../../../../../src/plugins/data_view_field_editor/public';
import type {
  DatasourceDimensionEditorProps,
  DatasourceDimensionTriggerProps,
  DatasourceDataPanelProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  InitializationOptions,
  OperationDescriptor,
  FramePublicAPI,
} from '../types';
import {
  loadInitialState,
  changeIndexPattern,
  changeLayerIndexPattern,
  extractReferences,
  injectReferences,
  loadIndexPatterns,
} from './loader';
import { toExpression } from './to_expression';
import {
  IndexPatternDimensionTrigger,
  IndexPatternDimensionEditor,
  getDropProps,
  onDrop,
} from './dimension_panel';
import { IndexPatternDataPanel } from './datapanel';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
  getDatasourceSuggestionsForVisualizeField,
  getDatasourceSuggestionsForVisualizeCharts,
} from './indexpattern_suggestions';

import { getFiltersInLayer, getVisualDefaultsForLayer, isColumnInvalid } from './utils';
import { normalizeOperationDataType, isDraggedField } from './pure_utils';
import { LayerPanel } from './layerpanel';
import {
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  getErrorMessages,
  insertNewColumn,
  TermsIndexPatternColumn,
} from './operations';
import { getReferenceRoot } from './operations/layer_helpers';
import {
  IndexPatternField,
  IndexPatternPrivateState,
  IndexPatternPersistedState,
  IndexPattern,
} from './types';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
} from '../../../../../src/plugins/kibana_react/public';
import { DataPublicPluginStart, ES_FIELD_TYPES } from '../../../../../src/plugins/data/public';
import { VisualizeFieldContext } from '../../../../../src/plugins/ui_actions/public';
import { mergeLayer } from './state_helpers';
import { Datasource, StateSetter, VisualizeEditorContext } from '../types';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { deleteColumn, isReferenced } from './operations';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { GeoFieldWorkspacePanel } from '../editor_frame_service/editor_frame/workspace_panel/geo_field_workspace_panel';
import { DraggingIdentifier } from '../drag_drop';
import { getStateTimeShiftWarningMessages } from './time_shift_utils';
import { getPrecisionErrorWarningMessages } from './utils';
import { DOCUMENT_FIELD_NAME } from '../../common/constants';
import { isColumnOfType } from './operations/definitions/helpers';
export type { OperationType, GenericIndexPatternColumn } from './operations';
export { deleteColumn } from './operations';

export function columnToOperation(
  column: GenericIndexPatternColumn,
  uniqueLabel?: string,
  dataView?: IndexPattern
): OperationDescriptor {
  const { dataType, label, isBucketed, scale, operationType, timeShift } = column;
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
  };
}

export type { FormatColumnArgs, TimeScaleArgs, CounterRateArgs } from '../../common/expressions';

export {
  getSuffixFormatter,
  unitSuffixesLong,
  suffixFormatterId,
} from '../../common/suffix_formatter';

export function getIndexPatternDatasource({
  core,
  storage,
  data,
  dataViews,
  fieldFormats,
  charts,
  dataViewFieldEditor,
  uiActions,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginSetup;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  uiActions: UiActionsStart;
}) {
  const uiSettings = core.uiSettings;
  const onIndexPatternLoadError = (err: Error) =>
    core.notifications.toasts.addError(err, {
      title: i18n.translate('xpack.lens.indexPattern.dataViewLoadError', {
        defaultMessage: 'Error loading data view',
      }),
    });

  const indexPatternsService = dataViews;

  const handleChangeIndexPattern = (
    id: string,
    state: IndexPatternPrivateState,
    setState: StateSetter<IndexPatternPrivateState, { applyImmediately?: boolean }>
  ) => {
    changeIndexPattern({
      id,
      state,
      setState,
      onError: onIndexPatternLoadError,
      storage,
      indexPatternsService,
    });
  };

  // Not stateful. State is persisted to the frame
  const indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState> = {
    id: 'indexpattern',

    async initialize(
      persistedState?: IndexPatternPersistedState,
      references?: SavedObjectReference[],
      initialContext?: VisualizeFieldContext | VisualizeEditorContext,
      options?: InitializationOptions
    ) {
      return loadInitialState({
        persistedState,
        references,
        defaultIndexPatternId: core.uiSettings.get('defaultIndex'),
        storage,
        indexPatternsService,
        initialContext,
        options,
      });
    },

    getPersistableState(state: IndexPatternPrivateState) {
      return extractReferences(state);
    },

    insertLayer(state: IndexPatternPrivateState, newLayerId: string) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: blankLayer(state.currentIndexPatternId),
        },
      };
    },

    removeLayer(state: IndexPatternPrivateState, layerId: string) {
      const newLayers = { ...state.layers };
      delete newLayers[layerId];

      return {
        ...state,
        layers: newLayers,
      };
    },

    clearLayer(state: IndexPatternPrivateState, layerId: string) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [layerId]: blankLayer(state.currentIndexPatternId),
        },
      };
    },

    getLayers(state: IndexPatternPrivateState) {
      return Object.keys(state.layers);
    },

    removeColumn({ prevState, layerId, columnId }) {
      const indexPattern = prevState.indexPatterns[prevState.layers[layerId]?.indexPatternId];
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

    initializeDimension(state, layerId, { columnId, groupId, staticValue }) {
      const indexPattern = state.indexPatterns[state.layers[layerId]?.indexPatternId];
      if (staticValue == null) {
        return state;
      }
      return mergeLayer({
        state,
        layerId,
        newLayer: insertNewColumn({
          layer: state.layers[layerId],
          op: 'static_value',
          columnId,
          field: undefined,
          indexPattern,
          visualizationGroups: [],
          initialParams: { params: { value: staticValue } },
          targetGroup: groupId,
        }),
      });
    },

    toExpression: (state, layerId) => toExpression(state, layerId, uiSettings),

    renderDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<IndexPatternPrivateState>
    ) {
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <IndexPatternDataPanel
              changeIndexPattern={handleChangeIndexPattern}
              data={data}
              dataViews={dataViews}
              fieldFormats={fieldFormats}
              charts={charts}
              indexPatternFieldEditor={dataViewFieldEditor}
              {...props}
              core={core}
              uiActions={uiActions}
            />
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    uniqueLabels(state: IndexPatternPrivateState) {
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

    isValidColumn: (state: IndexPatternPrivateState, layerId: string, columnId: string) => {
      const layer = state.layers[layerId];

      return !isColumnInvalid(layer, columnId, state.indexPatterns[layer.indexPatternId]);
    },

    renderDimensionTrigger: (
      domElement: Element,
      props: DatasourceDimensionTriggerProps<IndexPatternPrivateState>
    ) => {
      const columnLabelMap = indexPatternDatasource.uniqueLabels(props.state);

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
              }}
            >
              <IndexPatternDimensionTrigger
                uniqueLabel={columnLabelMap[props.columnId]}
                {...props}
              />
            </KibanaContextProvider>
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    renderDimensionEditor: (
      domElement: Element,
      props: DatasourceDimensionEditorProps<IndexPatternPrivateState>
    ) => {
      const columnLabelMap = indexPatternDatasource.uniqueLabels(props.state);

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
              }}
            >
              <IndexPatternDimensionEditor
                uiSettings={uiSettings}
                storage={storage}
                savedObjectsClient={core.savedObjects.client}
                http={core.http}
                data={data}
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
      props: DatasourceLayerPanelProps<IndexPatternPrivateState>
    ) => {
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <LayerPanel
            onChangeIndexPattern={(indexPatternId) => {
              changeLayerIndexPattern({
                indexPatternId,
                setState: props.setState,
                state: props.state,
                layerId: props.layerId,
                onError: onIndexPatternLoadError,
                replaceIfPossible: true,
                storage,
                indexPatternsService,
              });
            }}
            {...props}
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

    getCustomWorkspaceRenderer: (state: IndexPatternPrivateState, dragging: DraggingIdentifier) => {
      if (dragging.field === undefined || dragging.indexPatternId === undefined) {
        return undefined;
      }

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
                indexPatternId={draggedField.indexPatternId}
                fieldName={draggedField.field.name}
              />
            );
          }
        : undefined;
    },

    updateCurrentIndexPatternId: ({ state, indexPatternId, setState }) => {
      handleChangeIndexPattern(indexPatternId, state, setState);
    },

    refreshIndexPatternsList: async ({ indexPatternId, setState }) => {
      const newlyMappedIndexPattern = await loadIndexPatterns({
        indexPatternsService: dataViews,
        cache: {},
        patterns: [indexPatternId],
      });
      const indexPatternRefs = await dataViews.getIdsWithTitle();
      const indexPattern = newlyMappedIndexPattern[indexPatternId];
      setState((s) => {
        return {
          ...s,
          indexPatterns: {
            ...s.indexPatterns,
            [indexPattern.id]: indexPattern,
          },
          indexPatternRefs,
        };
      });
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

    getPublicAPI({ state, layerId }: PublicAPIProps<IndexPatternPrivateState>) {
      const columnLabelMap = indexPatternDatasource.uniqueLabels(state);
      const layer = state.layers[layerId];
      const visibleColumnIds = layer.columnOrder.filter((colId) => !isReferenced(layer, colId));

      return {
        datasourceId: 'indexpattern',
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
        getOperationForColumnId: (columnId: string) => {
          if (layer && layer.columns[columnId]) {
            if (!isReferenced(layer, columnId)) {
              return columnToOperation(
                layer.columns[columnId],
                columnLabelMap[columnId],
                state.indexPatterns[layer.indexPatternId]
              );
            }
          }
          return null;
        },
        getSourceId: () => layer.indexPatternId,
        getFilters: (activeData: FramePublicAPI['activeData']) =>
          getFiltersInLayer(layer, visibleColumnIds, activeData?.[layerId]),
        getVisualDefaults: () => getVisualDefaultsForLayer(layer),
      };
    },
    getDatasourceSuggestionsForField(state, draggedField, filterLayers) {
      return isDraggedField(draggedField)
        ? getDatasourceSuggestionsForField(
            state,
            draggedField.indexPatternId,
            draggedField.field,
            filterLayers
          )
        : [];
    },
    getDatasourceSuggestionsFromCurrentState,
    getDatasourceSuggestionsForVisualizeField,
    getDatasourceSuggestionsForVisualizeCharts,

    getErrorMessages(state) {
      if (!state) {
        return;
      }

      // Forward the indexpattern as well, as it is required by some operationType checks
      const layerErrors = Object.entries(state.layers)
        .filter(([_, layer]) => !!state.indexPatterns[layer.indexPatternId])
        .map(([layerId, layer]) =>
          (
            getErrorMessages(
              layer,
              state.indexPatterns[layer.indexPatternId],
              state,
              layerId,
              core
            ) ?? []
          ).map((message) => ({
            shortMessage: '', // Not displayed currently
            longMessage: typeof message === 'string' ? message : message.message,
            fixAction: typeof message === 'object' ? message.fixAction : undefined,
          }))
        );

      // Single layer case, no need to explain more
      if (layerErrors.length <= 1) {
        return layerErrors[0]?.length ? layerErrors[0] : undefined;
      }

      // For multiple layers we will prepend each error with the layer number
      const messages = layerErrors.flatMap((errors, index) => {
        return errors.map((error) => {
          const { shortMessage, longMessage } = error;
          return {
            shortMessage: shortMessage
              ? i18n.translate('xpack.lens.indexPattern.layerErrorWrapper', {
                  defaultMessage: 'Layer {position} error: {wrappedMessage}',
                  values: {
                    position: index + 1,
                    wrappedMessage: shortMessage,
                  },
                })
              : '',
            longMessage: longMessage
              ? i18n.translate('xpack.lens.indexPattern.layerErrorWrapper', {
                  defaultMessage: 'Layer {position} error: {wrappedMessage}',
                  values: {
                    position: index + 1,
                    wrappedMessage: longMessage,
                  },
                })
              : '',
          };
        });
      });
      return messages.length ? messages : undefined;
    },
    getWarningMessages: (state, frame, setState) => {
      return [
        ...(getStateTimeShiftWarningMessages(state, frame) || []),
        ...getPrecisionErrorWarningMessages(state, frame, core.docLinks, setState),
      ];
    },
    checkIntegrity: (state) => {
      const ids = Object.values(state.layers || {}).map(({ indexPatternId }) => indexPatternId);
      return ids.filter((id) => !state.indexPatterns[id]);
    },
    isTimeBased: (state) => {
      const { layers } = state;
      return (
        Boolean(layers) &&
        Object.values(layers).some((layer) => {
          const buckets = layer.columnOrder.filter((colId) => layer.columns[colId].isBucketed);
          return buckets.some((colId) => {
            const column = layer.columns[colId];
            return (
              isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column) &&
              !column.params.ignoreTimeRange
            );
          });
        })
      );
    },
    isEqual: (
      persistableState1: IndexPatternPersistedState,
      references1: SavedObjectReference[],
      persistableState2: IndexPatternPersistedState,
      references2: SavedObjectReference[]
    ) =>
      isEqual(
        injectReferences(persistableState1, references1),
        injectReferences(persistableState2, references2)
      ),
  };

  return indexPatternDatasource;
}

function blankLayer(indexPatternId: string) {
  return {
    indexPatternId,
    columns: {},
    columnOrder: [],
  };
}

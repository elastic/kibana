/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreStart, SavedObjectReference } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { IndexPatternFieldEditorStart } from '../../../../../src/plugins/index_pattern_field_editor/public';
import {
  DatasourceDimensionEditorProps,
  DatasourceDimensionTriggerProps,
  DatasourceDataPanelProps,
  Operation,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  InitializationOptions,
} from '../types';
import {
  loadInitialState,
  changeIndexPattern,
  changeLayerIndexPattern,
  extractReferences,
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
} from './indexpattern_suggestions';

import { isDraggedField, normalizeOperationDataType } from './utils';
import { LayerPanel } from './layerpanel';
import { IndexPatternColumn, getErrorMessages, IncompleteColumn } from './operations';
import { IndexPatternField, IndexPatternPrivateState, IndexPatternPersistedState } from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { VisualizeFieldContext } from '../../../../../src/plugins/ui_actions/public';
import { mergeLayer } from './state_helpers';
import { Datasource, StateSetter } from '../types';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { deleteColumn, isReferenced } from './operations';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { GeoFieldWorkspacePanel } from '../editor_frame_service/editor_frame/workspace_panel/geo_field_workspace_panel';
import { DraggingIdentifier } from '../drag_drop';
import { getTimeShiftWarningMessages } from './dimension_panel/time_shift';

export { OperationType, IndexPatternColumn, deleteColumn } from './operations';

export function columnToOperation(column: IndexPatternColumn, uniqueLabel?: string): Operation {
  const { dataType, label, isBucketed, scale } = column;
  return {
    dataType: normalizeOperationDataType(dataType),
    isBucketed,
    scale,
    label: uniqueLabel || label,
  };
}

export * from './rename_columns';
export * from './format_column';
export * from './time_scale';
export * from './counter_rate';
export * from './suffix_formatter';

export function getIndexPatternDatasource({
  core,
  storage,
  data,
  charts,
  indexPatternFieldEditor,
  uiActions,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  charts: ChartsPluginSetup;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  uiActions: UiActionsStart;
}) {
  const uiSettings = core.uiSettings;
  const onIndexPatternLoadError = (err: Error) =>
    core.notifications.toasts.addError(err, {
      title: i18n.translate('xpack.lens.indexPattern.indexPatternLoadError', {
        defaultMessage: 'Error loading index pattern',
      }),
    });

  const indexPatternsService = data.indexPatterns;

  const handleChangeIndexPattern = (
    id: string,
    state: IndexPatternPrivateState,
    setState: StateSetter<IndexPatternPrivateState>
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
      initialContext?: VisualizeFieldContext,
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

    toExpression: (state, layerId) => toExpression(state, layerId, uiSettings),

    renderDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<IndexPatternPrivateState>
    ) {
      render(
        <I18nProvider>
          <IndexPatternDataPanel
            changeIndexPattern={handleChangeIndexPattern}
            data={data}
            charts={charts}
            indexPatternFieldEditor={indexPatternFieldEditor}
            {...props}
            core={core}
            uiActions={uiActions}
          />
        </I18nProvider>,
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

    renderDimensionTrigger: (
      domElement: Element,
      props: DatasourceDimensionTriggerProps<IndexPatternPrivateState>
    ) => {
      const columnLabelMap = indexPatternDatasource.uniqueLabels(props.state);

      render(
        <I18nProvider>
          <KibanaContextProvider
            services={{
              appName: 'lens',
              storage,
              uiSettings,
              data,
              savedObjects: core.savedObjects,
              docLinks: core.docLinks,
            }}
          >
            <IndexPatternDimensionTrigger uniqueLabel={columnLabelMap[props.columnId]} {...props} />
          </KibanaContextProvider>
        </I18nProvider>,
        domElement
      );
    },

    renderDimensionEditor: (
      domElement: Element,
      props: DatasourceDimensionEditorProps<IndexPatternPrivateState>
    ) => {
      const columnLabelMap = indexPatternDatasource.uniqueLabels(props.state);

      render(
        <I18nProvider>
          <KibanaContextProvider
            services={{
              appName: 'lens',
              storage,
              uiSettings,
              data,
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
        </I18nProvider>,
        domElement
      );
    },

    renderLayerPanel: (
      domElement: Element,
      props: DatasourceLayerPanelProps<IndexPatternPrivateState>
    ) => {
      render(
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
        />,
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

    // Reset the temporary invalid state when closing the editor, but don't
    // update the state if it's not needed
    updateStateOnCloseDimension: ({ state, layerId, columnId }) => {
      const layer = { ...state.layers[layerId] };
      const current = state.layers[layerId].incompleteColumns || {};
      if (!Object.values(current).length) {
        return;
      }
      const newIncomplete: Record<string, IncompleteColumn> = { ...current };
      delete newIncomplete[columnId];
      return mergeLayer({
        state,
        layerId,
        newLayer: { ...layer, incompleteColumns: newIncomplete },
      });
    },

    getPublicAPI({ state, layerId }: PublicAPIProps<IndexPatternPrivateState>) {
      const columnLabelMap = indexPatternDatasource.uniqueLabels(state);

      return {
        datasourceId: 'indexpattern',

        getTableSpec: () => {
          return state.layers[layerId].columnOrder
            .filter((colId) => !isReferenced(state.layers[layerId], colId))
            .map((colId) => ({ columnId: colId }));
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];

          if (layer && layer.columns[columnId]) {
            if (!isReferenced(layer, columnId)) {
              return columnToOperation(layer.columns[columnId], columnLabelMap[columnId]);
            }
          }
          return null;
        },
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      return isDraggedField(draggedField)
        ? getDatasourceSuggestionsForField(state, draggedField.indexPatternId, draggedField.field)
        : [];
    },
    getDatasourceSuggestionsFromCurrentState,
    getDatasourceSuggestionsForVisualizeField,

    getErrorMessages(state, layersGroups) {
      if (!state) {
        return;
      }

      // Forward the indexpattern as well, as it is required by some operationType checks
      const layerErrors = Object.entries(state.layers).map(([layerId, layer]) =>
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
    getWarningMessages: getTimeShiftWarningMessages,
    checkIntegrity: (state) => {
      const ids = Object.values(state.layers || {}).map(({ indexPatternId }) => indexPatternId);
      return ids.filter((id) => !state.indexPatterns[id]);
    },
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

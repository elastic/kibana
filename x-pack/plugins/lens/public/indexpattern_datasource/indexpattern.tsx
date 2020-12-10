/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreStart, SavedObjectReference } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import {
  DatasourceDimensionEditorProps,
  DatasourceDimensionTriggerProps,
  DatasourceDataPanelProps,
  Operation,
  DatasourceLayerPanelProps,
  PublicAPIProps,
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
  canHandleDrop,
  onDrop,
} from './dimension_panel';
import { IndexPatternDataPanel } from './datapanel';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
  getDatasourceSuggestionsForVisualizeField,
} from './indexpattern_suggestions';

import {
  getInvalidColumnsForLayer,
  getInvalidLayers,
  isDraggedField,
  normalizeOperationDataType,
} from './utils';
import { LayerPanel } from './layerpanel';
import { IndexPatternColumn, getErrorMessages, IncompleteColumn } from './operations';
import { IndexPatternField, IndexPatternPrivateState, IndexPatternPersistedState } from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { VisualizeFieldContext } from '../../../../../src/plugins/ui_actions/public';
import { mergeLayer } from './state_helpers';
import { Datasource, StateSetter } from '../index';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { deleteColumn, isReferenced } from './operations';
import { FieldBasedIndexPatternColumn } from './operations/definitions/column_types';
import { Dragging } from '../drag_drop/providers';

export { OperationType, IndexPatternColumn, deleteColumn } from './operations';

export type DraggedField = Dragging & {
  field: IndexPatternField;
  indexPatternId: string;
};

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
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  charts: ChartsPluginSetup;
}) {
  const savedObjectsClient = core.savedObjects.client;
  const uiSettings = core.uiSettings;
  const onIndexPatternLoadError = (err: Error) =>
    core.notifications.toasts.addError(err, {
      title: i18n.translate('xpack.lens.indexPattern.indexPatternLoadError', {
        defaultMessage: 'Error loading index pattern',
      }),
    });

  const indexPatternsService = data.indexPatterns;

  // Not stateful. State is persisted to the frame
  const indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState> = {
    id: 'indexpattern',

    async initialize(
      persistedState?: IndexPatternPersistedState,
      references?: SavedObjectReference[],
      initialContext?: VisualizeFieldContext
    ) {
      return loadInitialState({
        persistedState,
        references,
        savedObjectsClient: await savedObjectsClient,
        defaultIndexPatternId: core.uiSettings.get('defaultIndex'),
        storage,
        indexPatternsService,
        initialContext,
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
      return mergeLayer({
        state: prevState,
        layerId,
        newLayer: deleteColumn({ layer: prevState.layers[layerId], columnId }),
      });
    },

    toExpression,

    renderDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<IndexPatternPrivateState>
    ) {
      render(
        <I18nProvider>
          <IndexPatternDataPanel
            changeIndexPattern={(
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
            }}
            data={data}
            charts={charts}
            {...props}
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

    canHandleDrop,
    onDrop,

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
            return columnToOperation(layer.columns[columnId], columnLabelMap[columnId]);
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
      const invalidLayers = getInvalidLayers(state);

      const layerErrors = Object.values(state.layers).flatMap((layer) =>
        (getErrorMessages(layer) ?? []).map((message) => ({
          shortMessage: message,
          longMessage: '',
        }))
      );

      if (invalidLayers.length === 0) {
        return layerErrors.length ? layerErrors : undefined;
      }

      const realIndex = Object.values(state.layers)
        .map((layer, i) => {
          const filteredIndex = invalidLayers.indexOf(layer);
          if (filteredIndex > -1) {
            return [filteredIndex, i + 1];
          }
        })
        .filter(Boolean) as Array<[number, number]>;
      const invalidColumnsForLayer: string[][] = getInvalidColumnsForLayer(
        invalidLayers,
        state.indexPatterns
      );
      const originalLayersList = Object.keys(state.layers);

      if (layerErrors.length || realIndex.length) {
        return [
          ...layerErrors,
          ...realIndex.map(([filteredIndex, layerIndex]) => {
            const columnLabelsWithBrokenReferences: string[] = invalidColumnsForLayer[
              filteredIndex
            ].map((columnId) => {
              const column = invalidLayers[filteredIndex].columns[
                columnId
              ] as FieldBasedIndexPatternColumn;
              return column.label;
            });

            if (originalLayersList.length === 1) {
              return {
                shortMessage: i18n.translate(
                  'xpack.lens.indexPattern.dataReferenceFailureShortSingleLayer',
                  {
                    defaultMessage:
                      'Invalid {columns, plural, one {reference} other {references}}.',
                    values: {
                      columns: columnLabelsWithBrokenReferences.length,
                    },
                  }
                ),
                longMessage: i18n.translate(
                  'xpack.lens.indexPattern.dataReferenceFailureLongSingleLayer',
                  {
                    defaultMessage: `"{columns}" {columnsLength, plural, one {has an} other {have}} invalid reference.`,
                    values: {
                      columns: columnLabelsWithBrokenReferences.join('", "'),
                      columnsLength: columnLabelsWithBrokenReferences.length,
                    },
                  }
                ),
              };
            }
            return {
              shortMessage: i18n.translate('xpack.lens.indexPattern.dataReferenceFailureShort', {
                defaultMessage:
                  'Invalid {columnsLength, plural, one {reference} other {references}} on Layer {layer}.',
                values: {
                  layer: layerIndex,
                  columnsLength: columnLabelsWithBrokenReferences.length,
                },
              }),
              longMessage: i18n.translate('xpack.lens.indexPattern.dataReferenceFailureLong', {
                defaultMessage: `Layer {layer} has {columnsLength, plural, one {an invalid} other {invalid}} {columnsLength, plural, one {reference} other {references}} in "{columns}".`,
                values: {
                  layer: layerIndex,
                  columns: columnLabelsWithBrokenReferences.join('", "'),
                  columnsLength: columnLabelsWithBrokenReferences.length,
                },
              }),
            };
          }),
        ];
      }
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

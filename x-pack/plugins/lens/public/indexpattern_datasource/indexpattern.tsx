/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreStart } from 'kibana/public';
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
import { loadInitialState, changeIndexPattern, changeLayerIndexPattern } from './loader';
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
} from './indexpattern_suggestions';

import { isDraggedField, normalizeOperationDataType } from './utils';
import { LayerPanel } from './layerpanel';
import { IndexPatternColumn } from './operations';
import {
  IndexPatternField,
  IndexPatternLayer,
  IndexPatternPrivateState,
  IndexPatternPersistedState,
} from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { deleteColumn } from './state_helpers';
import { Datasource, StateSetter } from '../index';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';

export { OperationType, IndexPatternColumn } from './operations';

export interface DraggedField {
  field: IndexPatternField;
  indexPatternId: string;
}

export function columnToOperation(column: IndexPatternColumn, uniqueLabel?: string): Operation {
  const { dataType, label, isBucketed, scale } = column;
  return {
    dataType: normalizeOperationDataType(dataType),
    isBucketed,
    scale,
    label: uniqueLabel || label,
  };
}

/**
 * Return a map of columnId => unique column label. Exported for testing reasons.
 */
export function uniqueLabels(layers: Record<string, IndexPatternLayer>) {
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
}

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

  // Not stateful. State is persisted to the frame
  const indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState> = {
    id: 'indexpattern',

    async initialize(state?: IndexPatternPersistedState) {
      return loadInitialState({
        state,
        savedObjectsClient: await savedObjectsClient,
        defaultIndexPatternId: core.uiSettings.get('defaultIndex'),
        storage,
      });
    },

    getPersistableState({ currentIndexPatternId, layers }: IndexPatternPrivateState) {
      return { currentIndexPatternId, layers };
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
      return deleteColumn({
        state: prevState,
        layerId,
        columnId,
      });
    },

    toExpression,

    getMetaData(state: IndexPatternPrivateState) {
      return {
        filterableIndexPatterns: _.uniq(
          Object.values(state.layers)
            .map((layer) => layer.indexPatternId)
            .map((indexPatternId) => ({
              id: indexPatternId,
              title: state.indexPatterns[indexPatternId].title,
            }))
        ),
      };
    },

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
                savedObjectsClient,
                onError: onIndexPatternLoadError,
                storage,
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

    renderDimensionTrigger: (
      domElement: Element,
      props: DatasourceDimensionTriggerProps<IndexPatternPrivateState>
    ) => {
      const columnLabelMap = uniqueLabels(props.state.layers);

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
      const columnLabelMap = uniqueLabels(props.state.layers);

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
              savedObjectsClient,
              indexPatternId,
              setState: props.setState,
              state: props.state,
              layerId: props.layerId,
              onError: onIndexPatternLoadError,
              replaceIfPossible: true,
              storage,
            });
          }}
          {...props}
        />,
        domElement
      );
    },

    canHandleDrop,
    onDrop,

    getPublicAPI({ state, layerId }: PublicAPIProps<IndexPatternPrivateState>) {
      const columnLabelMap = uniqueLabels(state.layers);

      return {
        datasourceId: 'indexpattern',

        getTableSpec: () => {
          return state.layers[layerId].columnOrder.map((colId) => ({ columnId: colId }));
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

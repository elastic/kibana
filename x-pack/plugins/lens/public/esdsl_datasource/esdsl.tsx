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
import { EuiButton, EuiSelect } from '@elastic/eui';
import {
  DatasourceDimensionEditorProps,
  DatasourceDimensionTriggerProps,
  DatasourceDataPanelProps,
  Operation,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  DataType,
} from '../types';
import { loadInitialState, changeIndexPattern, changeLayerIndexPattern } from './loader';
import { toExpression } from './to_expression';
import {
  IndexPatternDimensionTrigger,
  IndexPatternDimensionEditor,
  canHandleDrop,
  onDrop,
} from './dimension_panel';
import { EsDSLDataPanel } from './datapanel';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
} from './indexpattern_suggestions';

import { isDraggedField, normalizeOperationDataType } from './utils';
import { LayerPanel } from './layerpanel';
import { IndexPatternColumn } from './operations';
import { IndexPatternField, EsDSLLayer, EsDSLPrivateState, EsDSLPersistedState } from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { deleteColumn } from './state_helpers';
import { Datasource, StateSetter } from '../index';
import { flatten } from './flatten';

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

export function getEsDSLDatasource({
  core,
  storage,
  data,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
}) {
  // Not stateful. State is persisted to the frame
  const esdslDatasource: Datasource<EsDSLPrivateState, EsDSLPersistedState> = {
    id: 'esdsl',

    async initialize(state?: EsDSLPersistedState) {
      const initState = state || { layers: {} };
      const responses = await Promise.all(
        Object.entries(initState.layers).map(([id, layer]) => {
          return data.search
            .search({
              params: {
                size: 0,
                index: layer.index,
                body: {
                  aggs: JSON.parse(layer.query),
                },
              },
            })
            .toPromise();
        })
      );
      const cachedFieldList: Record<
        string,
        { fields: Array<{ name: string; type: string }>; singleRow: boolean }
      > = {};
      responses.forEach((response, index) => {
        const layerId = Object.keys(initState.layers)[index];
        const rows = flatten(response.rawResponse);
        const columns = Object.keys(rows[0]).map(key => ({
          name: key,
          type: typeof rows[0][key],
        }));
        cachedFieldList[layerId] = { fields: columns, singleRow: rows.length === 1 };
      });
      return {
        ...initState,
        cachedFieldList,
        removedLayers: [],
      };
    },

    getPersistableState({ layers }: EsDSLPrivateState) {
      return { layers };
    },

    insertLayer(state: EsDSLPrivateState, newLayerId: string) {
      const removedLayer = state.removedLayers[0];
      const newRemovedList = removedLayer ? state.removedLayers.slice(1) : state.removedLayers;
      return {
        ...state,
        cachedFieldList: {
          ...state.cachedFieldList,
          [newLayerId]: removedLayer
            ? removedLayer.fieldList
            : {
                fields: [],
                singleRow: false,
              },
        },
        layers: {
          ...state.layers,
          [newLayerId]: removedLayer ? removedLayer.layer : blankLayer(),
        },
        removedLayers: newRemovedList,
      };
    },

    removeLayer(state: EsDSLPrivateState, layerId: string) {
      const deletedLayer = state.layers[layerId];
      const newLayers = { ...state.layers };
      delete newLayers[layerId];

      const deletedFieldList = state.cachedFieldList[layerId];
      const newFieldList = { ...state.cachedFieldList };
      delete newFieldList[layerId];

      return {
        ...state,
        layers: newLayers,
        cachedFieldList: newFieldList,
        removedLayers: deletedLayer.query
          ? [
              { layer: { ...deletedLayer, columns: [] }, fieldList: deletedFieldList },
              ...state.removedLayers,
            ]
          : state.removedLayers,
      };
    },

    clearLayer(state: EsDSLPrivateState, layerId: string) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [layerId]: { ...state.layers[layerId], columns: [] },
        },
      };
    },

    getLayers(state: EsDSLPrivateState) {
      return Object.keys(state.layers);
    },

    removeColumn({ prevState, layerId, columnId }) {
      return {
        ...prevState,
        layers: {
          ...prevState.layers,
          [layerId]: {
            ...prevState.layers[layerId],
            columns: prevState.layers[layerId].columns.filter(col => col.columnId !== columnId),
          },
        },
      };
    },

    toExpression,

    getMetaData(state: EsDSLPrivateState) {
      return {
        filterableIndexPatterns: [],
      };
    },

    renderDataPanel(domElement: Element, props: DatasourceDataPanelProps<EsDSLPrivateState>) {
      render(
        <I18nProvider>
          <EsDSLDataPanel data={data} {...props} />
        </I18nProvider>,
        domElement
      );
    },

    renderDimensionTrigger: (
      domElement: Element,
      props: DatasourceDimensionTriggerProps<EsDSLPrivateState>
    ) => {
      const selectedField = props.state.layers[props.layerId].columns.find(
        column => column.columnId === props.columnId
      )!;
      render(
        <EuiButton onClick={() => props.togglePopover()}>{selectedField.fieldName}</EuiButton>,
        domElement
      );
    },

    renderDimensionEditor: (
      domElement: Element,
      props: DatasourceDimensionEditorProps<EsDSLPrivateState>
    ) => {
      const fields = props.state.cachedFieldList[props.layerId].fields;
      const selectedField = props.state.layers[props.layerId].columns.find(
        column => column.columnId === props.columnId
      );
      render(
        <EuiSelect
          value={selectedField?.fieldName || ''}
          options={[
            { value: '', text: 'Please select' },
            ...fields.map(field => ({ value: field.name, text: field.name })),
          ]}
          onChange={e => {
            props.setState(
              !selectedField
                ? {
                    ...props.state,
                    layers: {
                      ...props.state.layers,
                      [props.layerId]: {
                        ...props.state.layers[props.layerId],
                        columns: [
                          ...props.state.layers[props.layerId].columns,
                          { columnId: props.columnId, fieldName: e.target.value },
                        ],
                      },
                    },
                  }
                : {
                    ...props.state,
                    layers: {
                      ...props.state.layers,
                      [props.layerId]: {
                        ...props.state.layers[props.layerId],
                        columns: props.state.layers[props.layerId].columns.map(col =>
                          col.columnId !== props.columnId
                            ? col
                            : { ...col, fieldName: e.target.value }
                        ),
                      },
                    },
                  }
            );
          }}
        />,
        domElement
      );
    },

    renderLayerPanel: (
      domElement: Element,
      props: DatasourceLayerPanelProps<EsDSLPrivateState>
    ) => {
      render(<span>{props.state.layers[props.layerId].index}</span>, domElement);
    },

    canHandleDrop: () => false,
    onDrop: () => false,

    getPublicAPI({ state, layerId }: PublicAPIProps<EsDSLPrivateState>) {
      return {
        datasourceId: 'esdsl',

        getTableSpec: () => {
          return (
            state.layers[layerId]?.columns.map(column => ({ columnId: column.columnId })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];
          const column = layer?.columns.find(c => c.columnId === columnId);

          if (column) {
            const field = state.cachedFieldList[layerId].fields.find(
              f => f.name === column.fieldName
            )!;
            const overwrite = layer.overwrittenFieldTypes?.[column.fieldName];
            return {
              dataType: overwrite || (field.type as DataType),
              label: field.name,
              isBucketed: false,
            };
          }
          return null;
        },
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      return [];
    },
    getDatasourceSuggestionsFromCurrentState: state => {
      return Object.entries(state.layers).map(([id, layer]) => {
        const reducedState: EsDSLPrivateState = {
          ...state,
          cachedFieldList: {
            [id]: state.cachedFieldList[id],
          },
          layers: {
            [id]: state.layers[id],
          },
        };
        return {
          state: reducedState,
          table: {
            changeType: 'unchanged',
            isMultiRow: !state.cachedFieldList[id].singleRow,
            layerId: id,
            columns: layer.columns.map(column => {
              const field = state.cachedFieldList[id].fields.find(
                f => f.name === column.fieldName
              )!;
              const operation = {
                dataType: field.type as DataType,
                label: field.name,
                isBucketed: false,
              };
              return {
                columnId: column.columnId,
                operation,
              };
            }),
          },
          keptLayerIds: [id],
        };
      });
    },
  };

  return esdslDatasource;
}

function blankLayer() {
  return {
    index: '*',
    query: '',
    columns: [],
  };
}

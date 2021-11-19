/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { toExpression } from './to_expression';
import { EsSQLDataPanel, EsSQLHorizontalDataPanel } from './datapanel';

import type { DataViewsService } from '../../../../../src/plugins/data_views/common';
import { EsSQLLayer, EsSQLPrivateState, EsSQLPersistedState } from './types';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { Datasource } from '../types';
import { esRawResponse } from '../../../../../src/plugins/data/common';
import { ExpressionsStart } from 'src/plugins/expressions/public';

async function loadIndexPatternRefs(
  indexPatternsService: DataViewsService
): Promise<IndexPatternRef[]> {
  const indexPatterns = await indexPatternsService.getIdsWithTitle();

  const timefields = await Promise.all(
    indexPatterns.map((p) => indexPatternsService.get(p.id).then((pat) => pat.timeFieldName))
  );

  return indexPatterns
    .map((p, i) => ({ ...p, timeField: timefields[i] }))
    .sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
}

export function getEsSQLDatasource({
  core,
  storage,
  data,
  expressions,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
}) {
  // Not stateful. State is persisted to the frame
  const essqlDatasource: Datasource<EsSQLPrivateState, EsSQLPersistedState> = {
    id: 'essql',

    checkIntegrity: () => {
      return [];
    },
    getErrorMessages: () => {
      return [];
    },
    async initialize(state?: EsSQLPersistedState) {
      const initState = state || { layers: {} };
      const indexPatternRefs: IndexPatternRef[] = await loadIndexPatternRefs(data.dataViews);
      const responses = await Promise.all(
        Object.entries(initState.layers).map(([id, layer]) => {
          return data.search
            .search({
              params: {
                size: 0,
                index: layer.index,
                body: JSON.parse(layer.query),
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
        // @ts-expect-error this is hacky, should probably run expression instead
        const { rows, columns } = esRawResponse.to!.datatable({ body: response.rawResponse });
        // todo hack some logic in for dates
        cachedFieldList[layerId] = { fields: columns, singleRow: rows.length === 1 };
      });
      return {
        ...initState,
        cachedFieldList,
        removedLayers: [],
        indexPatternRefs,
      };
    },

    getPersistableState({ layers }: EsSQLPrivateState) {
      return { state: { layers }, savedObjectReferences: [] };
    },
    isValidColumn() {
      return true;
    },
    insertLayer(state: EsSQLPrivateState, newLayerId: string) {
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
          [newLayerId]: removedLayer
            ? removedLayer.layer
            : blankLayer(
                JSON.parse(localStorage.getItem('lens-settings') || '{}').indexPatternId ||
                  state.indexPatternRefs[0].id
              ),
        },
        removedLayers: newRemovedList,
      };
    },

    removeLayer(state: EsSQLPrivateState, layerId: string) {
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

    clearLayer(state: EsSQLPrivateState, layerId: string) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [layerId]: { ...state.layers[layerId], columns: [] },
        },
      };
    },

    getLayers(state: EsSQLPrivateState) {
      return Object.keys(state.layers);
    },

    removeColumn({ prevState, layerId, columnId }) {
      return {
        ...prevState,
        layers: {
          ...prevState.layers,
          [layerId]: {
            ...prevState.layers[layerId],
            columns: prevState.layers[layerId].columns.filter((col) => col.columnId !== columnId),
          },
        },
      };
    },

    toExpression,

    getMetaData(state: EsSQLPrivateState) {
      return {
        filterableIndexPatterns: [],
      };
    },

    renderDataPanel(domElement: Element, props: DatasourceDataPanelProps<EsSQLPrivateState>) {
      render(
        <I18nProvider>
          <EsSQLDataPanel data={data} expressions={expressions} {...props} />
        </I18nProvider>,
        domElement
      );
    },

    renderHorizontalDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<EsSQLPrivateState>
    ) {
      render(
        <I18nProvider>
          <EsSQLHorizontalDataPanel data={data} expressions={expressions} {...props} />
        </I18nProvider>,
        domElement
      );
    },

    renderDimensionTrigger: (
      domElement: Element,
      props: DatasourceDimensionTriggerProps<EsSQLPrivateState>
    ) => {
      const selectedField = props.state.layers[props.layerId].columns.find(
        (column) => column.columnId === props.columnId
      )!;
      render(<EuiButton onClick={() => {}}>{selectedField.fieldName}</EuiButton>, domElement);
    },

    renderDimensionEditor: (
      domElement: Element,
      props: DatasourceDimensionEditorProps<EsSQLPrivateState>
    ) => {
      const fields = props.state.cachedFieldList[props.layerId].fields;
      const selectedField = props.state.layers[props.layerId].columns.find(
        (column) => column.columnId === props.columnId
      );
      render(
        <EuiSelect
          value={selectedField?.fieldName || ''}
          options={[
            { value: '', text: 'Please select' },
            ...fields.map((field) => ({ value: field.name, text: field.name })),
          ]}
          onChange={(e) => {
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
                        columns: props.state.layers[props.layerId].columns.map((col) =>
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
      props: DatasourceLayerPanelProps<EsSQLPrivateState>
    ) => {
      render(
        <span>
          {
            props.state.indexPatternRefs.find(
              (r) => r.id === props.state.layers[props.layerId].index
            )!.title
          }
        </span>,
        domElement
      );
    },

    canHandleDrop: () => false,
    onDrop: () => false,
    uniqueLabels(state: EsSQLPrivateState) {
      const layers = state.layers;
      const columnLabelMap = {} as Record<string, string>;

      Object.values(layers).forEach((layer) => {
        if (!layer.columns) {
          return;
        }
        Object.entries(layer.columns).forEach(([columnId, column]) => {
          columnLabelMap[columnId] = columnId;
        });
      });

      return columnLabelMap;
    },

    getDropProps: () => undefined,

    getPublicAPI({ state, layerId }: PublicAPIProps<EsSQLPrivateState>) {
      return {
        datasourceId: 'essql',

        getTableSpec: () => {
          return (
            state.layers[layerId]?.columns.map((column) => ({ columnId: column.columnId })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];
          const column = layer?.columns.find((c) => c.columnId === columnId);

          if (column) {
            const field = state.cachedFieldList[layerId].fields.find(
              (f) => f.name === column.fieldName
            )!;
            const overwrite = layer.overwrittenFieldTypes?.[column.fieldName];
            return {
              dataType: overwrite || (field?.meta?.type as DataType),
              label: field?.name,
              isBucketed: false,
              noBucketInfo: true,
            };
          }
          return null;
        },
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      return [];
    },
    getDatasourceSuggestionsFromCurrentState: (state) => {
      return Object.entries(state.layers).map(([id, layer]) => {
        const reducedState: EsSQLPrivateState = {
          ...state,
          cachedFieldList: {
            [id]: state.cachedFieldList[id],
          },
          layers: {
            [id]: state.layers[id],
          },
        };
        return !state.autoMap
          ? {
              state: reducedState,
              table: {
                changeType: 'unchanged',
                isMultiRow: !state.cachedFieldList[id].singleRow,
                layerId: id,
                columns: layer.columns.map((column) => {
                  const field = state.cachedFieldList[id].fields.find(
                    (f) => f.name === column.fieldName
                  )!;
                  const operation = {
                    dataType: field?.meta.type as DataType,
                    label: field?.name,
                    isBucketed: false,
                    noBucketInfo: true,
                  };
                  return {
                    columnId: column.columnId,
                    operation,
                  };
                }),
              },
              keptLayerIds: [id],
            }
          : {
              state: {
                ...reducedState,
                layers: {
                  [id]: {
                    ...state.layers[id],
                    columns: state.cachedFieldList[id].fields.map((f) => ({
                      columnId: f.name,
                      fieldName: f.name,
                    })),
                  },
                },
              },
              table: {
                changeType: 'unchanged',
                isMultiRow: !state.cachedFieldList[id].singleRow,
                layerId: id,
                columns: state.cachedFieldList[id].fields.map((f) => {
                  return {
                    columnId: f.name,
                    operation: {
                      dataType: f.meta.type,
                      label: f.name,
                      isBucketed: false,
                      noBucketInfo: true,
                    },
                  };
                }),
              },
              keptLayerIds: [id],
            };
      });
    },
  };

  return essqlDatasource;
}

function blankLayer(index: string) {
  return {
    index,
    query: '',
    columns: [],
  };
}

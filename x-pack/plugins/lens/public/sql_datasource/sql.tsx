/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { CoreStart } from '@kbn/core/public';
// import { i18n } from '@kbn/i18n';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
// import { isOfAggregateQueryType, getIndexPatternFromSQLQuery } from '@kbn/es-query';
import { EuiButton, EuiSelect } from '@elastic/eui';
import { DatatableColumn, ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DatasourceDimensionEditorProps,
  DatasourceDimensionTriggerProps,
  DatasourceDataPanelProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  DataType,
  TableChangeType,
} from '../types';
import { toExpression } from './to_expression';
import { EsSQLDataPanel } from './datapanel';
// import { fetchSql } from './fetch_sql';
import { EsSQLPrivateState, EsSQLPersistedState } from './types';
import { Datasource } from '../types';

export function getSQLDatasource({
  core,
  storage,
  data,
  expressions,
  dataViews,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  dataViews: DataViewsPublicPluginStart;
}) {
  const getSuggestionsForState = (state: EsSQLPrivateState) => {
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
              changeType: 'unchanged' as TableChangeType,
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
              changeType: 'unchanged' as TableChangeType,
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
  };
  const sqlDatasource: Datasource<EsSQLPrivateState, EsSQLPersistedState> = {
    id: 'sql',

    checkIntegrity: () => {
      return [];
    },
    getErrorMessages: () => {
      return [];
    },
    initialize(state?: EsSQLPersistedState) {
      const initState = state || { layers: {} };
      // const indexPatternRefs: IndexPatternRef[] = await loadIndexPatternRefs(dataViews);
      const cachedFieldList: Record<string, { fields: DatatableColumn[]; singleRow: boolean }> = {};
      // if (query && isOfAggregateQueryType(query) && 'sql' in query) {
      //   const table = await fetchSql(query, dataViews, data, expressions);
      //   const index = getIndexPatternFromSQLQuery(query.sql);
      //   const columns = table?.columns ?? [];
      //   cachedFieldList['123'] = {
      //     fields: columns ?? [],
      //     singleRow: table?.rows.length === 1,
      //   };
      //   initState.layers['123'] = {
      //     hideFilterBar: true,
      //     index,
      //     query: query.sql,
      //     columns: columns.map((c) => ({ columnId: c.id, fieldName: c.id })),
      //   };
      // }
      // if (context && 'sql' in context) {
      //   const table = await fetchSql(context, dataViews, data, expressions);
      //   const index = getIndexPatternFromSQLQuery(context.sql);
      //   // todo hack some logic in for dates
      //   const columns = table?.columns ?? [];
      //   cachedFieldList['123'] = {
      //     fields: columns ?? [],
      //     singleRow: table?.rows.length === 1,
      //   };
      //   initState.layers['123'] = {
      //     hideFilterBar: true,
      //     query: context.sql,
      //     index,
      //     columns: columns.map((c) => ({ columnId: c.id, fieldName: c.id })),
      //   };
      // }
      return {
        ...initState,
        cachedFieldList,
        removedLayers: [],
        indexPatternRefs: [],
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
    // updateLayerId(state: EsSQLPrivateState, oldLayerId: string, newLayerId: string) {
    //   let layers = {};
    //   Object.entries(state.layers).map(([key, value]) => {
    //     if (key === oldLayerId) {
    //       layers = {
    //         ...layers,
    //         [newLayerId]: value,
    //       };
    //     } else {
    //       layers = {
    //         ...layers,
    //         [key]: value,
    //       };
    //     }
    //   });
    //   return {
    //     ...state,
    //     layers,
    //   };
    // },
    createEmptyLayer(indexPatternId: string) {
      return {
        indexPatternRefs: [],
        layers: {},
        removedLayers: [],
        cachedFieldList: {},
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
    getCurrentIndexPatternId(state: EsSQLPrivateState) {
      const layers = Object.values(state.layers);
      return layers?.[0]?.index;
    },
    isTimeBased: (state, indexPatterns) => {
      if (!state) return false;
      // const { layers } = state;
      // return (
      //   Boolean(layers) &&
      //   Object.values(layers).some((layer) => {
      //     return (
      //       Boolean(indexPatterns[layer.indexPatternId]?.timeFieldName) ||
      //       layer.columnOrder
      //         .filter((colId) => layer.columns[colId].isBucketed)
      //         .some((colId) => {
      //           const column = layer.columns[colId];
      //           return (
      //             isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column) &&
      //             !column.params.ignoreTimeRange
      //           );
      //         })
      //     );
      //   })
      // );
      return true;
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
          <EsSQLDataPanel data={data} dataViews={dataViews} expressions={expressions} {...props} />
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
            )?.title
          }
        </span>,
        domElement
      );
    },

    onDrop: (props) => {
      const { droppedItem, dropType } = props;

      if (dropType === 'field_add') {
        const currentLayer = props.state.layers[props.layerId];
        const columnExists = currentLayer.columns.some((c) => c.columnId === props.columnId);
        props.setState({
          ...props.state,
          layers: {
            ...props.state.layers,
            [props.layerId]: {
              ...props.state.layers[props.layerId],
              columns: columnExists
                ? currentLayer.columns.map((c) =>
                    c.columnId !== props.columnId ? c : { ...c, fieldName: droppedItem.field }
                  )
                : [
                    ...props.state.layers[props.layerId].columns,
                    { columnId: props.columnId, fieldName: droppedItem.field },
                  ],
            },
          },
        });
        return true;
      }
      return false;
    },
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

    getDropProps: (props) => {
      if (!props.dragging?.isSqlField) return undefined;

      return { dropTypes: ['field_add'], nextLabel: props.dragging?.field };
    },

    getPublicAPI({ state, layerId }: PublicAPIProps<EsSQLPrivateState>) {
      return {
        datasourceId: 'sql',

        getTableSpec: () => {
          return (
            state.layers[layerId]?.columns.map((column) => ({ columnId: column.columnId })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];
          const column = layer?.columns.find((c) => c.columnId === columnId);

          if (column) {
            const field = state.cachedFieldList[layerId]?.fields?.find(
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
        getVisualDefaults: () => ({}),
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      return [];
    },
    getDatasourceSuggestionsForVisualizeField: getSuggestionsForState,
    getDatasourceSuggestionsFromCurrentState: getSuggestionsForState,
    getDatasourceSuggestionsForVisualizeCharts: getSuggestionsForState,
    isEqual: () => true,
  };

  return sqlDatasource;
}

function blankLayer(index: string) {
  return {
    index,
    query: '',
    columns: [],
  };
}

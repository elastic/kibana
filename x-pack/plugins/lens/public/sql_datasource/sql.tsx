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
import { isOfAggregateQueryType, AggregateQuery } from '@kbn/es-query';
import { EuiSelect, EuiButtonEmpty } from '@elastic/eui';
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
// import { generateId } from '../id_generator';
import { toExpression } from './to_expression';
import { EsSQLDataPanel } from './datapanel';
import { fetchSql } from './fetch_sql';
import { loadIndexPatternRefs } from './utils';
import { EsSQLPrivateState, EsSQLPersistedState, IndexPatternRef, EsSQLLayerColumn } from './types';
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
    return Object.entries(state.layers)?.map(([id, layer]) => {
      // const reducedState: EsSQLPrivateState = {
      //   ...state,
      //   fieldList: state.fieldList,
      //   layers: {
      //     [id]: state.layers[id],
      //   },
      // };
      return {
        state: {
          ...state,
        },
        table: {
          changeType: 'unchanged' as TableChangeType,
          isMultiRow: false,
          layerId: id,
          columns:
            layer.columns?.map((f) => {
              return {
                columnId: f.columnId,
                operation: {
                  dataType: f?.meta?.type,
                  label: f.fieldName,
                  isBucketed: false,
                },
              };
            }) ?? [],
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
    async initialize(state?: EsSQLPersistedState) {
      const initState = state || { layers: {} };
      const indexPatternRefs: IndexPatternRef[] = await loadIndexPatternRefs(dataViews);
      let fieldList: DatatableColumn[] = [];
      if (state) {
        const layer = Object.values(state?.layers)?.[0];
        if (layer && layer.query && isOfAggregateQueryType(layer.query) && 'sql' in layer.query) {
          const table = await fetchSql(layer.query, dataViews, data, expressions);
          const columnsFromQuery = table?.columns ?? [];
          // const layerIds = Object.keys(state.layers);
          // const newLayerId = layerIds.length > 0 ? layerIds[0] : generateId();
          // const existingColumns = state.layers[newLayerId].columns;
          // const columns = [
          //   ...existingColumns,
          //   ...columnsFromQuery.map((c) => ({ columnId: c.id, fieldName: c.id, meta: c.meta })),
          // ];
          // const uniqueIds: string[] = [];

          // const unique = columns.filter((col) => {
          //   const isDuplicate = uniqueIds.includes(col.columnId);

          //   if (!isDuplicate) {
          //     uniqueIds.push(col.columnId);

          //     return true;
          //   }

          //   return false;
          // });

          // fieldList = unique.map((u) => {
          //   const field = columnsFromQuery.find((c) => c.name === u.fieldName);
          //   return {
          //     name: u.fieldName,
          //     id: u.columnId,
          //     meta: field?.meta,
          //   };
          // }) as DatatableColumn[];
          fieldList = columnsFromQuery;
        }
      }
      // const temp = fetchFieldList(query, data, expressions, timeFieldName);
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
        fieldList,
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
      const layer = Object.values(state?.layers)?.[0];
      const query = layer?.query;
      const columns = layer?.columns ?? [];
      const removedLayer = state.removedLayers[0];
      const newRemovedList = removedLayer ? state.removedLayers.slice(1) : state.removedLayers;
      const index =
        layer?.index ??
        (JSON.parse(localStorage.getItem('lens-settings') || '{}').indexPatternId ||
          state.indexPatternRefs[0].id);
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: removedLayer ? removedLayer.layer : blankLayer(index, query, columns),
        },
        removedLayers: newRemovedList,
      };
    },
    createEmptyLayer() {
      return {
        indexPatternRefs: [],
        layers: {},
        removedLayers: [],
        fieldList: [],
      };
    },

    removeLayer(state: EsSQLPrivateState, layerId: string) {
      const deletedLayer = state.layers[layerId];
      const newLayers = {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          selectedColumns: [],
        },
      };
      // delete newLayers[layerId];

      const deletedFieldList = state.fieldList;

      return {
        ...state,
        layers: newLayers,
        fieldList: state.fieldList,
        removedLayers: deletedLayer.query
          ? [{ layer: { ...deletedLayer }, fieldList: deletedFieldList }, ...state.removedLayers]
          : state.removedLayers,
      };
    },

    clearLayer(state: EsSQLPrivateState, layerId: string) {
      return {
        ...state,
        layers: {
          ...state.layers,
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
    getUsedDataView: (state: EsSQLPrivateState, layerId: string) => {
      return state.layers[layerId].index;
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

    toExpression: (state, layerId, indexPatterns, timeRange) => {
      return toExpression(state, layerId, timeRange);
    },

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
      const layer = props.state.layers[props.layerId];
      const selectedField = layer?.columns?.find((column) => column.columnId === props.columnId)!;
      render(
        <EuiButtonEmpty onClick={() => {}}>
          {selectedField?.customLabel ?? selectedField?.fieldName}
        </EuiButtonEmpty>,
        domElement
      );
    },

    getRenderEventCounters(state: EsSQLPrivateState): string[] {
      return [];
    },

    renderDimensionEditor: (
      domElement: Element,
      props: DatasourceDimensionEditorProps<EsSQLPrivateState>
    ) => {
      const fields = props.state.fieldList;
      const selectedField = props.state.layers[props.layerId]?.columns?.find(
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
            const meta = fields.find((f) => f.name === e.target.value)?.meta;
            props.setState(
              !selectedField
                ? {
                    ...props.state,
                    // fieldList: meta
                    //   ? [...fields, { id: props.columnId, name: e.target.value, meta }]
                    //   : fields,
                    layers: {
                      ...props.state.layers,
                      [props.layerId]: {
                        ...props.state.layers[props.layerId],
                        columns: [
                          ...props.state.layers[props.layerId].columns,
                          {
                            columnId: props.columnId,
                            fieldName: e.target.value,
                            meta,
                          },
                        ],
                        selectedColumns: [
                          ...props.state.layers[props.layerId].selectedColumns,
                          {
                            columnId: props.columnId,
                            fieldName: e.target.value,
                            meta,
                          },
                        ],
                      },
                    },
                  }
                : {
                    ...props.state,
                    // fieldList: meta
                    //   ? [...fields, { id: props.columnId, name: e.target.value, meta }]
                    //   : fields,
                    layers: {
                      ...props.state.layers,
                      [props.layerId]: {
                        ...props.state.layers[props.layerId],
                        columns: props.state.layers[props.layerId].columns.map((col) =>
                          col.columnId !== props.columnId
                            ? col
                            : { ...col, fieldName: e.target.value, customLabel: undefined }
                        ),
                        selectedColumns: props.state.layers[props.layerId].selectedColumns.map(
                          (col) =>
                            col.columnId !== props.columnId
                              ? col
                              : { ...col, fieldName: e.target.value, customLabel: undefined }
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
      const { source } = props;
      if (!source) {
        return;
      }
      const label = source.field as string;
      return { dropTypes: ['field_add'], nextLabel: label };
    },

    onDrop: (props) => {
      const { dropType, state, source, target } = props;
      const { layers } = state;
      // console.dir(props);
      // const layerId = Object.keys(layers)?.[0];

      if (dropType === 'field_add') {
        Object.keys(layers).forEach((layerId) => {
          const field = layers[layerId].columns.find((f) => f.columnId === source.id);
          const currentLayer = props.state.layers[layerId];
          const columnExists = currentLayer.columns.some((c) => c.columnId === source.columnId);
          const numCols = currentLayer.columns.filter((c) => c.fieldName === field?.fieldName);
          props.setState({
            ...props.state,
            // fieldList: field
            //   ? [...fieldList, { id: target.columnId, name: field.name, meta: field.meta }]
            //   : fieldList,
            layers: {
              ...props.state.layers,
              [layerId]: {
                ...props.state.layers[layerId],
                columns: [
                  ...currentLayer.columns,
                  {
                    columnId: target.columnId,
                    customLabel: columnExists
                      ? `${field?.fieldName}[${numCols.length - 1}]`
                      : field?.fieldName ?? '',
                    fieldName: field?.fieldName ?? '',
                    meta: field?.meta,
                  },
                ],
                selectedColumns: [
                  ...currentLayer.selectedColumns,
                  {
                    columnId: target.columnId,
                    customLabel: columnExists
                      ? `${field?.fieldName}[${numCols.length - 1}]`
                      : field?.fieldName ?? '',
                    fieldName: field?.fieldName ?? '',
                    meta: field?.meta,
                  },
                ],
                // columns: currentLayer.columns.map((c) =>
                //   c.columnId !== target.columnId
                //     ? c
                //     : { ...c, fieldName: field?.fieldName ?? '', meta: field?.meta }
                // ),
              },
            },
          });
        });
        // const field = layers[layerId].columns.find((f) => f.columnId === source.id);
        // const currentLayer = props.state.layers[layerId];
        // const columnExists = currentLayer.columns.some((c) => c.columnId === source.columnId);
        // const numCols = currentLayer.columns.filter((c) => c.fieldName === field?.fieldName);
        // props.setState({
        //   ...props.state,
        //   // fieldList: field
        //   //   ? [...fieldList, { id: target.columnId, name: field.name, meta: field.meta }]
        //   //   : fieldList,
        //   layers: {
        //     ...props.state.layers,
        //     [layerId]: {
        //       ...props.state.layers[layerId],
        //       columns: [
        //         ...currentLayer.columns,
        //         {
        //           columnId: target.columnId,
        //           customLabel: columnExists
        //             ? `${field?.fieldName}[${numCols.length - 1}]`
        //             : field?.fieldName ?? '',
        //           fieldName: field?.fieldName ?? '',
        //           meta: field?.meta,
        //         },
        //       ],
        //       // columns: currentLayer.columns.map((c) =>
        //       //   c.columnId !== target.columnId
        //       //     ? c
        //       //     : { ...c, fieldName: field?.fieldName ?? '', meta: field?.meta }
        //       // ),
        //     },
        //   },
        // });
        return true;
      }
      return false;
    },

    getPublicAPI({ state, layerId }: PublicAPIProps<EsSQLPrivateState>) {
      return {
        datasourceId: 'sql',

        getTableSpec: () => {
          return (
            state.layers[layerId]?.selectedColumns?.map((column) => ({
              columnId: column.columnId,
            })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];
          const column = layer?.columns?.find((c) => c.columnId === columnId);

          if (column) {
            return {
              dataType: column?.meta?.type as DataType,
              label: column?.fieldName,
              isBucketed: false,
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

function blankLayer(index: string, query?: AggregateQuery, columns?: EsSQLLayerColumn[]) {
  return {
    index,
    query,
    columns: columns ?? [],
    selectedColumns: [],
  };
}

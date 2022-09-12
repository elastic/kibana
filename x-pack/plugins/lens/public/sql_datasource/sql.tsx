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
import { i18n } from '@kbn/i18n';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { isOfAggregateQueryType, AggregateQuery } from '@kbn/es-query';
import { EuiButtonEmpty, EuiFormRow } from '@elastic/eui';
import type { DatatableColumn, ExpressionsStart } from '@kbn/expressions-plugin/public';
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
import { generateId } from '../id_generator';
import { toExpression } from './to_expression';
import { EsSQLDataPanel } from './datapanel';
import { fetchSql } from './fetch_sql';
import { loadIndexPatternRefs } from './utils';
import type {
  EsSQLPrivateState,
  EsSQLPersistedState,
  IndexPatternRef,
  EsSQLLayerColumn,
  TextBasedLanguageField,
} from './types';
import { FieldSelect } from './field_select';
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
                  dataType: f?.meta?.type as DataType,
                  label: f.fieldName,
                  isBucketed: Boolean(f?.meta?.type !== 'number'),
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
    getErrorMessages: (state) => {
      const errors: Error[] = [];

      Object.values(state.layers).forEach((layer) => {
        if (layer.errors && layer.errors.length > 0) {
          errors.push(...layer.errors);
        }
      });
      return errors.map((err) => {
        return {
          shortMessage: err.message,
          longMessage: err.message,
        };
      });
    },
    getUnifiedSearchErrors: (state) => {
      const errors: Error[] = [];

      Object.values(state.layers).forEach((layer) => {
        if (layer.errors && layer.errors.length > 0) {
          errors.push(...layer.errors);
        }
      });
      return errors;
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
          fieldList = columnsFromQuery;
        }
      }
      return {
        ...initState,
        fieldList,
        indexPatternRefs,
      };
    },
    onRefreshIndexPattern() {},

    getUsedDataViews: (state) => {
      return Object.values(state.layers).map(({ index }) => index);
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
      const columns = layer?.allColumns ?? [];
      const index =
        layer?.index ??
        (JSON.parse(localStorage.getItem('lens-settings') || '{}').indexPatternId ||
          state.indexPatternRefs[0].id);
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: blankLayer(index, query, columns),
        },
      };
    },
    createEmptyLayer() {
      return {
        indexPatternRefs: [],
        layers: {},
        fieldList: [],
      };
    },

    removeLayer(state: EsSQLPrivateState, layerId: string) {
      const newLayers = {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          columns: [],
        },
      };

      return {
        ...state,
        layers: newLayers,
        fieldList: state.fieldList,
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
      return state && state.layers ? Object.keys(state?.layers) : [];
    },
    getCurrentIndexPatternId(state: EsSQLPrivateState) {
      const layers = Object.values(state.layers);
      return layers?.[0]?.index;
    },
    isTimeBased: (state, indexPatterns) => {
      if (!state) return false;
      const { layers } = state;
      return (
        Boolean(layers) &&
        Object.values(layers).some((layer) => {
          return Boolean(indexPatterns[layer.index]?.timeFieldName);
        })
      );
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
      const selectedField = layer?.allColumns?.find(
        (column) => column.columnId === props.columnId
      )!;
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
      const selectedField = props.state.layers[props.layerId]?.allColumns?.find(
        (column) => column.columnId === props.columnId
      );
      render(
        <EuiFormRow
          data-test-subj="text-based-languages-field-selection-row"
          label={i18n.translate('xpack.lens.textBasedLanguages.chooseField', {
            defaultMessage: 'Field',
          })}
          fullWidth
          className="lnsIndexPatternDimensionEditor--padded"
        >
          <FieldSelect
            existingFields={fields}
            selectedField={selectedField}
            onChoose={(choice) => {
              const meta = fields.find((f) => f.name === choice.field)?.meta;
              const newColumn = {
                columnId: props.columnId,
                fieldName: choice.field,
                meta,
              };
              return props.setState(
                !selectedField
                  ? {
                      ...props.state,
                      layers: {
                        ...props.state.layers,
                        [props.layerId]: {
                          ...props.state.layers[props.layerId],
                          columns: [...props.state.layers[props.layerId].columns, newColumn],
                          allColumns: [...props.state.layers[props.layerId].allColumns, newColumn],
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
                              : { ...col, fieldName: choice.field, customLabel: undefined }
                          ),
                          allColumns: props.state.layers[props.layerId].allColumns.map((col) =>
                            col.columnId !== props.columnId
                              ? col
                              : { ...col, fieldName: choice.field, customLabel: undefined }
                          ),
                        },
                      },
                    }
              );
            }}
          />
        </EuiFormRow>,
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
      const layers = state?.layers;
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

      if (dropType === 'field_add') {
        Object.keys(layers).forEach((layerId) => {
          const field = layers[layerId].allColumns.find((f) => f.columnId === source.id);
          const currentLayer = props.state.layers[layerId];
          const columnExists = currentLayer.allColumns.some((c) => c.columnId === source.columnId);
          const numCols = currentLayer.allColumns.filter((c) => c.fieldName === field?.fieldName);
          const newColumn = {
            columnId: target.columnId,
            customLabel: columnExists
              ? `${field?.fieldName}[${numCols.length - 1}]`
              : field?.fieldName ?? '',
            fieldName: field?.fieldName ?? '',
            meta: field?.meta,
          };
          props.setState({
            ...props.state,
            layers: {
              ...props.state.layers,
              [layerId]: {
                ...props.state.layers[layerId],
                columns: [...currentLayer.columns, newColumn],
                allColumns: [...currentLayer.allColumns, newColumn],
              },
            },
          });
        });
        return true;
      }
      return false;
    },

    getPublicAPI({ state, layerId }: PublicAPIProps<EsSQLPrivateState>) {
      return {
        datasourceId: 'sql',

        getTableSpec: () => {
          return (
            state.layers[layerId]?.columns?.map((column) => ({
              columnId: column.columnId,
              fields: [column.fieldName],
            })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];
          const column = layer?.allColumns?.find((c) => c.columnId === columnId);

          if (column) {
            return {
              dataType: column?.meta?.type as DataType,
              label: column?.fieldName,
              isBucketed: false,
              hasTimeShift: false,
            };
          }
          return null;
        },
        getVisualDefaults: () => ({}),
        isTextBasedLanguage: () => true,
        getMaxPossibleNumValues: (columnId) => {
          return null;
        },
        getSourceId: () => {
          const layer = state.layers[layerId];
          return layer.index;
        },
        getFilters: () => {
          return {
            enabled: {
              kuery: [],
              lucene: [],
            },
            disabled: {
              kuery: [],
              lucene: [],
            },
          };
        },
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      const field = state.fieldList.find(
        (f) => f.id === (draggedField as TextBasedLanguageField).id
      );
      if (!field) return [];
      return Object.entries(state.layers)?.map(([id, layer]) => {
        const newId = generateId();
        const newColumn = {
          columnId: newId,
          fieldName: field?.name ?? '',
          meta: field?.meta,
        };
        return {
          state: {
            ...state,
            layers: {
              ...state.layers,
              [id]: {
                ...state.layers[id],
                columns: [...layer.columns, newColumn],
                allColumns: [...layer.allColumns, newColumn],
              },
            },
          },
          table: {
            changeType: 'initial' as TableChangeType,
            isMultiRow: false,
            layerId: id,
            columns: [
              ...layer.columns?.map((f) => {
                return {
                  columnId: f.columnId,
                  operation: {
                    dataType: f?.meta?.type as DataType,
                    label: f.fieldName,
                    isBucketed: Boolean(f?.meta?.type !== 'number'),
                  },
                };
              }),
              {
                columnId: newId,
                operation: {
                  dataType: field?.meta?.type as DataType,
                  label: field?.name ?? '',
                  isBucketed: Boolean(field?.meta?.type !== 'number'),
                },
              },
            ],
          },
          keptLayerIds: [id],
        };
      });
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
    columns: [],
    allColumns: columns ?? [],
  };
}

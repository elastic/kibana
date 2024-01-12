/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { AggregateQuery, isOfAggregateQueryType, getAggregateQueryMode } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core/public';
import { EuiFormRow } from '@elastic/eui';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { DimensionTrigger } from '@kbn/visualization-ui-components';
import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import { TextBasedDataPanel } from './datapanel';
import { toExpression } from './to_expression';
import {
  DatasourceDimensionEditorProps,
  DatasourceDataPanelProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  DataType,
  TableChangeType,
  DatasourceDimensionTriggerProps,
  DataSourceInfo,
  UserMessage,
} from '../../types';
import { generateId } from '../../id_generator';
import type {
  TextBasedPrivateState,
  TextBasedPersistedState,
  TextBasedLayerColumn,
  TextBasedField,
} from './types';
import { FieldSelect } from './field_select';
import type { Datasource } from '../../types';
import { getUniqueLabelGenerator, nonNullable } from '../../utils';
import { onDrop, getDropProps } from './dnd';
import { removeColumn } from './remove_column';
import { canColumnBeUsedBeInMetricDimension, MAX_NUM_OF_COLUMNS } from './utils';

function getLayerReferenceName(layerId: string) {
  return `textBasedLanguages-datasource-layer-${layerId}`;
}

const getSelectedFieldsFromColumns = memoizeOne(
  (columns: TextBasedLayerColumn[]) =>
    columns
      .map((c) => {
        if ('fieldName' in c) {
          return c.fieldName;
        }
      })
      .filter(nonNullable),
  isEqual
);

export function getTextBasedDatasource({
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
  const getSuggestionsForState = (state: TextBasedPrivateState) => {
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
              const inMetricDimension = canColumnBeUsedBeInMetricDimension(
                layer.allColumns,
                f?.meta?.type
              );
              return {
                columnId: f.columnId,
                operation: {
                  dataType: f?.meta?.type as DataType,
                  label: f.fieldName,
                  isBucketed: Boolean(f?.meta?.type !== 'number'),
                  // makes non-number fields to act as metrics, used for datatable suggestions
                  ...(inMetricDimension && {
                    inMetricDimension,
                  }),
                },
              };
            }) ?? [],
        },
        keptLayerIds: [id],
      };
    });
  };
  const getSuggestionsForVisualizeField = (
    state: TextBasedPrivateState,
    indexPatternId: string,
    fieldName: string
  ) => {
    const context = state.initialContext;
    // on text based mode we offer suggestions for the query and not for a specific field
    if (fieldName) return [];
    if (context && 'dataViewSpec' in context && context.dataViewSpec.title && context.query) {
      const newLayerId = generateId();
      const textBasedQueryColumns = context.textBasedColumns ?? [];
      // Number fields are assigned automatically as metrics (!isBucketed). There are cases where the query
      // will not return number fields. In these cases we want to suggest a datatable
      // Datatable works differently in this case. On the metrics dimension can be all type of fields
      const hasNumberTypeColumns = textBasedQueryColumns?.some((c) => c?.meta?.type === 'number');
      const newColumns = textBasedQueryColumns.map((c) => {
        const inMetricDimension = canColumnBeUsedBeInMetricDimension(
          textBasedQueryColumns,
          c?.meta?.type
        );
        return {
          columnId: c.id,
          fieldName: c.name,
          meta: c.meta,
          // makes non-number fields to act as metrics, used for datatable suggestions
          ...(inMetricDimension && {
            inMetricDimension,
          }),
        };
      });

      const index = context.dataViewSpec.id ?? context.dataViewSpec.title;
      const query = context.query;
      const updatedState = {
        ...state,
        initialContext: undefined,
        fieldList: textBasedQueryColumns,
        ...(context.dataViewSpec.id
          ? {
              indexPatternRefs: [
                {
                  id: context.dataViewSpec.id,
                  title: context.dataViewSpec.title,
                  timeField: context.dataViewSpec.timeFieldName,
                },
              ],
            }
          : {}),
        layers: {
          ...state.layers,
          [newLayerId]: {
            index,
            query,
            columns: newColumns.slice(0, MAX_NUM_OF_COLUMNS) ?? [],
            allColumns: newColumns ?? [],
            timeField: context.dataViewSpec.timeFieldName,
          },
        },
      };

      return [
        {
          state: {
            ...updatedState,
          },
          table: {
            changeType: 'initial' as TableChangeType,
            isMultiRow: false,
            notAssignedMetrics: !hasNumberTypeColumns,
            layerId: newLayerId,
            columns:
              newColumns?.slice(0, MAX_NUM_OF_COLUMNS)?.map((f) => {
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
          keptLayerIds: [newLayerId],
        },
      ];
    }

    return [];
  };
  const TextBasedDatasource: Datasource<TextBasedPrivateState, TextBasedPersistedState> = {
    id: 'textBased',

    checkIntegrity: () => {
      return [];
    },
    getUserMessages: (state) => {
      const errors: Error[] = [];

      Object.values(state.layers).forEach((layer) => {
        if (layer.errors && layer.errors.length > 0) {
          errors.push(...layer.errors);
        }
      });
      return errors.map((err) => {
        const message: UserMessage = {
          severity: 'error',
          fixableInEditor: true,
          displayLocations: [{ id: 'visualization' }, { id: 'textBasedLanguagesQueryInput' }],
          shortMessage: err.message,
          longMessage: err.message,
        };
        return message;
      });
    },
    initialize(
      state?: TextBasedPersistedState,
      savedObjectReferences?,
      context?,
      indexPatternRefs?,
      indexPatterns?
    ) {
      const patterns = indexPatterns ? Object.values(indexPatterns) : [];
      const refs = patterns.map((p) => {
        return {
          id: p.id,
          title: p.title,
          timeField: p.timeFieldName,
        };
      });

      const initState = state || { layers: {} };
      return {
        ...initState,
        indexPatternRefs: refs,
        initialContext: context,
      };
    },

    syncColumns({ state }) {
      // TODO implement this for real
      return state;
    },

    onRefreshIndexPattern() {},

    getUsedDataViews: (state) => {
      return Object.values(state.layers).map(({ index }) => index);
    },

    getPersistableState({ layers }: TextBasedPrivateState) {
      const savedObjectReferences: SavedObjectReference[] = [];
      Object.entries(layers).forEach(([layerId, { index, ...persistableLayer }]) => {
        if (index) {
          savedObjectReferences.push({
            type: 'index-pattern',
            id: index,
            name: getLayerReferenceName(layerId),
          });
        }
      });
      return { state: { layers }, savedObjectReferences };
    },
    insertLayer(state: TextBasedPrivateState, newLayerId: string) {
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

    cloneLayer(state, layerId, newLayerId, getNewId) {
      return {
        ...state,
      };
    },

    removeLayer(state: TextBasedPrivateState, layerId: string) {
      const newLayers = {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          columns: [],
        },
      };

      return {
        removedLayerIds: [layerId],
        newState: {
          ...state,
          layers: newLayers,
          fieldList: state.fieldList,
        },
      };
    },

    clearLayer(state: TextBasedPrivateState, layerId: string) {
      return {
        removedLayerIds: [],
        newState: {
          ...state,
          layers: {
            ...state.layers,
            [layerId]: { ...state.layers[layerId], columns: [] },
          },
        },
      };
    },

    getLayers(state: TextBasedPrivateState) {
      return state && state.layers ? Object.keys(state?.layers) : [];
    },
    // there are cases where a query can return a big amount of columns
    // at this case we don't suggest all columns in a table but the first
    // MAX_NUM_OF_COLUMNS
    suggestsLimitedColumns(state: TextBasedPrivateState) {
      const fieldsList = state?.fieldList ?? [];
      return fieldsList.length >= MAX_NUM_OF_COLUMNS;
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
    getUsedDataView: (state: TextBasedPrivateState, layerId?: string) => {
      if (!layerId) {
        const layers = Object.values(state.layers);
        return layers?.[0]?.index;
      }
      return state.layers[layerId].index;
    },

    removeColumn,

    toExpression: (state, layerId, indexPatterns, dateRange, searchSessionId) => {
      return toExpression(state, layerId);
    },
    getSelectedFields(state) {
      return getSelectedFieldsFromColumns(
        Object.values(state?.layers)?.flatMap((l) => Object.values(l.columns))
      );
    },

    DataPanelComponent(props: DatasourceDataPanelProps<TextBasedPrivateState>) {
      const layerFields = TextBasedDatasource?.getSelectedFields?.(props.state);
      return (
        <TextBasedDataPanel
          data={data}
          dataViews={dataViews}
          expressions={expressions}
          layerFields={layerFields}
          {...props}
        />
      );
    },

    DimensionTriggerComponent: (props: DatasourceDimensionTriggerProps<TextBasedPrivateState>) => {
      const columnLabelMap = TextBasedDatasource.uniqueLabels(props.state, props.indexPatterns);
      const layer = props.state.layers[props.layerId];
      const selectedField = layer?.allColumns?.find((column) => column.columnId === props.columnId);
      let customLabel: string | undefined = columnLabelMap[props.columnId];
      if (!customLabel) {
        customLabel = selectedField?.fieldName;
      }

      return (
        <DimensionTrigger
          id={props.columnId}
          color={customLabel && selectedField ? 'primary' : 'danger'}
          dataTestSubj="lns-dimensionTrigger-textBased"
          label={
            customLabel ??
            i18n.translate('xpack.lens.textBasedLanguages.missingField', {
              defaultMessage: 'Missing field',
            })
          }
        />
      );
    },

    getRenderEventCounters(state: TextBasedPrivateState): string[] {
      const context = state?.initialContext;
      if (context && 'query' in context && context.query && isOfAggregateQueryType(context.query)) {
        const language = getAggregateQueryMode(context.query);
        // it will eventually log render_lens_esql_chart
        return [`${language}_chart`];
      }
      return [];
    },

    DimensionEditorComponent: (props: DatasourceDimensionEditorProps<TextBasedPrivateState>) => {
      const fields = props.state.fieldList;
      const allColumns = props.state.layers[props.layerId]?.allColumns;
      const selectedField = allColumns?.find((column) => column.columnId === props.columnId);
      const hasNumberTypeColumns = allColumns?.some((c) => c?.meta?.type === 'number');

      const updatedFields = fields?.map((f) => {
        return {
          ...f,
          compatible:
            props.isMetricDimension && hasNumberTypeColumns
              ? props.filterOperations({
                  dataType: f.meta.type as DataType,
                  isBucketed: Boolean(f?.meta?.type !== 'number'),
                  scale: 'ordinal',
                })
              : true,
        };
      });
      return (
        <>
          <EuiFormRow
            data-test-subj="text-based-languages-field-selection-row"
            label={i18n.translate('xpack.lens.textBasedLanguages.chooseField', {
              defaultMessage: 'Field',
            })}
            fullWidth
            className="lnsIndexPatternDimensionEditor--padded"
          >
            <FieldSelect
              existingFields={updatedFields ?? []}
              selectedField={selectedField}
              onChoose={(choice) => {
                const meta = fields?.find((f) => f.name === choice.field)?.meta;
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
                            allColumns: [
                              ...props.state.layers[props.layerId].allColumns,
                              newColumn,
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
                                : { ...col, fieldName: choice.field, meta }
                            ),
                            allColumns: props.state.layers[props.layerId].allColumns.map((col) =>
                              col.columnId !== props.columnId
                                ? col
                                : { ...col, fieldName: choice.field, meta }
                            ),
                          },
                        },
                      }
                );
              }}
            />
          </EuiFormRow>
          {props.dataSectionExtra && (
            <div
              style={{
                paddingLeft: euiThemeVars.euiSize,
                paddingRight: euiThemeVars.euiSize,
              }}
            >
              {props.dataSectionExtra}
            </div>
          )}
        </>
      );
    },

    LayerPanelComponent: (props: DatasourceLayerPanelProps<TextBasedPrivateState>) => {
      return null;
    },

    uniqueLabels(state: TextBasedPrivateState) {
      const layers = state.layers;
      const columnLabelMap = {} as Record<string, string>;
      const uniqueLabelGenerator = getUniqueLabelGenerator();

      Object.values(layers).forEach((layer) => {
        if (!layer.columns) {
          return;
        }
        Object.values(layer.columns).forEach((column) => {
          columnLabelMap[column.columnId] = uniqueLabelGenerator(column.fieldName);
        });
      });

      return columnLabelMap;
    },
    getDropProps,
    onDrop,
    getPublicAPI({ state, layerId, indexPatterns }: PublicAPIProps<TextBasedPrivateState>) {
      return {
        datasourceId: 'textBased',

        getTableSpec: () => {
          const columns = state.layers[layerId]?.columns.filter((c) => {
            const columnExists = state?.fieldList?.some((f) => f.name === c?.fieldName);
            if (columnExists) return c;
          });
          return (
            columns.map((column) => ({
              columnId: column.columnId,
              fields: [column.fieldName],
            })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];
          const column = layer?.allColumns?.find((c) => c.columnId === columnId);
          const columnLabelMap = TextBasedDatasource.uniqueLabels(state, indexPatterns);

          if (column) {
            return {
              dataType: column?.meta?.type as DataType,
              label: columnLabelMap[columnId] ?? column?.fieldName,
              isBucketed: Boolean(column?.meta?.type !== 'number'),
              inMetricDimension: column.inMetricDimension,
              hasTimeShift: false,
              hasReducedTimeRange: false,
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
        hasDefaultTimeField: () => false,
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      const field = state.fieldList?.find((f) => f.id === (draggedField as TextBasedField).id);
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
    getDatasourceSuggestionsForVisualizeField: getSuggestionsForVisualizeField,
    getDatasourceSuggestionsFromCurrentState: getSuggestionsForState,
    getDatasourceSuggestionsForVisualizeCharts: getSuggestionsForState,
    isEqual: (
      persistableState1: TextBasedPersistedState,
      references1: SavedObjectReference[],
      persistableState2: TextBasedPersistedState,
      references2: SavedObjectReference[]
    ) => isEqual(persistableState1, persistableState2),
    getDatasourceInfo: async (state, references, dataViewsService) => {
      const indexPatterns: DataView[] = [];
      for (const { index } of Object.values(state.layers)) {
        const dataView = await dataViewsService?.get(index);
        if (dataView) {
          indexPatterns.push(dataView);
        }
      }
      return Object.entries(state.layers).reduce<DataSourceInfo[]>((acc, [key, layer]) => {
        const columns = Object.entries(layer.columns).map(([colId, col]) => {
          return {
            id: colId,
            role: col.meta?.type !== 'number' ? ('split' as const) : ('metric' as const),
            operation: {
              dataType: col?.meta?.type as DataType,
              label: col.fieldName,
              isBucketed: Boolean(col?.meta?.type !== 'number'),
              hasTimeShift: false,
              hasReducedTimeRange: false,
              fields: [col.fieldName],
              type: col.meta?.type || 'unknown',
              filter: undefined,
            },
          };
        });

        acc.push({
          layerId: key,
          columns,
          dataView: indexPatterns?.find((dataView) => dataView.id === layer.index),
        });

        return acc;
      }, []);
    },
  };

  return TextBasedDatasource;
}

function blankLayer(index: string, query?: AggregateQuery, columns?: TextBasedLayerColumn[]) {
  return {
    index,
    query,
    columns: [],
    allColumns: columns ?? [],
  };
}

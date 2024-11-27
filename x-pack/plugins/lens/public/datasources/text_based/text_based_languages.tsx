/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { isOfAggregateQueryType, getAggregateQueryMode } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import { toExpression } from './to_expression';
import { PublicAPIProps, DataType, DataSourceInfo, OperationMetadata } from '../../types';
import type { TextBasedPrivateState, TextBasedPersistedState, TextBasedLayerColumn } from './types';
import type { Datasource } from '../../types';
import { getUniqueLabelGenerator, nonNullable } from '../../utils';
import { onDrop, getDropProps } from './dnd';
import { removeColumn } from './remove_column';
import { isNotNumeric } from './utils';

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
  const TextBasedDatasource: Datasource<TextBasedPrivateState, TextBasedPersistedState> = {
    id: 'textBased',

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

    onRefreshIndexPattern() {},

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
      const index =
        layer?.index ??
        (JSON.parse(localStorage.getItem('lens-settings') || '{}').indexPatternId ||
          state.indexPatternRefs[0].id);
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: blankLayer(index, query),
        },
      };
    },

    getLayers(state: TextBasedPrivateState) {
      return state && state.layers ? Object.keys(state?.layers) : [];
    },
    isTimeBased: (state, indexPatterns) => {
      if (!state) return false;
      const { layers } = state;
      return (
        Boolean(layers) &&
        Object.values(layers).some((layer) => {
          return layer.index && Boolean(indexPatterns[layer.index]?.timeFieldName);
        })
      );
    },
    getUsedDataView: (state: TextBasedPrivateState, layerId?: string) => {
      if (!layerId || !state.layers[layerId].index) {
        const layers = Object.values(state.layers);
        return layers?.[0]?.index as string;
      }
      return state.layers[layerId].index as string;
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

    getRenderEventCounters(state: TextBasedPrivateState): string[] {
      const context = state?.initialContext;
      if (context && 'query' in context && context.query && isOfAggregateQueryType(context.query)) {
        const language = getAggregateQueryMode(context.query);
        // it will eventually log render_lens_esql_chart
        return [`${language}_chart`];
      }
      return [];
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
          return (
            state.layers[layerId]?.columns.map((column) => ({
              columnId: column.columnId,
              fields: [column.fieldName],
            })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];
          const column = layer?.columns?.find((c) => c.columnId === columnId);
          const columnLabelMap = TextBasedDatasource.uniqueLabels(state, indexPatterns);
          let scale: OperationMetadata['scale'] = 'ordinal';
          switch (column?.meta?.type) {
            case 'date':
              scale = 'interval';
              break;
            case 'number':
              scale = 'ratio';
              break;
            default:
              scale = 'ordinal';
              break;
          }

          if (column) {
            return {
              dataType: column?.meta?.type as DataType,
              label: columnLabelMap[columnId] ?? column?.fieldName,
              isBucketed: Boolean(isNotNumeric(column)),
              inMetricDimension: column.inMetricDimension,
              hasTimeShift: false,
              hasReducedTimeRange: false,
              scale,
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
    getDatasourceSuggestionsForField(state, draggedField) {},
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
        if (index) {
          const dataView = await dataViewsService?.get(index);
          if (dataView) {
            indexPatterns.push(dataView);
          }
        }
      }
      return Object.entries(state.layers).reduce<DataSourceInfo[]>((acc, [key, layer]) => {
        const columns = Object.entries(layer.columns).map(([colId, col]) => {
          return {
            id: colId,
            role: isNotNumeric(col) ? ('split' as const) : ('metric' as const),
            operation: {
              dataType: col?.meta?.type as DataType,
              label: col.fieldName,
              isBucketed: Boolean(isNotNumeric(col)),
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

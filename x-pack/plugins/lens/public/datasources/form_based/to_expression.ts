/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { partition, uniq } from 'lodash';
import seedrandom from 'seedrandom';
import {
  AggFunctionsMapping,
  EsaggsExpressionFunctionDefinition,
  IndexPatternLoadExpressionFunctionDefinition,
} from '@kbn/data-plugin/public';
import { queryToAst } from '@kbn/data-plugin/common';
import {
  buildExpression,
  buildExpressionFunction,
  ExpressionAstExpression,
  ExpressionAstExpressionBuilder,
  ExpressionAstFunction,
} from '@kbn/expressions-plugin/public';
import { GenericIndexPatternColumn } from './form_based';
import { operationDefinitionMap } from './operations';
import { FormBasedPrivateState, FormBasedLayer } from './types';
import { DateHistogramIndexPatternColumn, RangeIndexPatternColumn } from './operations/definitions';
import { FormattedIndexPatternColumn } from './operations/definitions/column_types';
import { isColumnFormatted, isColumnOfType } from './operations/definitions/helpers';
import type { IndexPattern, IndexPatternMap } from '../../types';
import { dedupeAggs } from './dedupe_aggs';

export type OriginalColumn = { id: string } & GenericIndexPatternColumn;

declare global {
  interface Window {
    /**
     * Debug setting to make requests complete slower than normal. data.search.aggs.shardDelay.enabled has to be set via settings for this to work
     */
    ELASTIC_LENS_DELAY_SECONDS?: number;
  }
}

// esAggs column ID manipulation functions
export const extractAggId = (id: string) => id.split('.')[0].split('-')[2];
const updatePositionIndex = (currentId: string, newIndex: number) => {
  const [fullId, percentile] = currentId.split('.');
  const idParts = fullId.split('-');
  idParts[1] = String(newIndex);
  return idParts.join('-') + (percentile ? `.${percentile}` : '');
};

function getExpressionForLayer(
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  uiSettings: IUiSettingsClient,
  searchSessionId?: string
): ExpressionAstExpression | null {
  const { columnOrder } = layer;
  if (columnOrder.length === 0 || !indexPattern) {
    return null;
  }
  const columns = { ...layer.columns };
  // make sure the columns are in topological order
  const sortedColumns = sortedReferences(
    columnOrder.map((colId) => [colId, columns[colId]] as const)
  );

  sortedColumns.forEach((columnId) => {
    const column = columns[columnId];
    const rootDef = operationDefinitionMap[column.operationType];
    if ('references' in column && rootDef.filterable && column.filter) {
      // inherit filter to all referenced operations
      function setFilterForAllReferences(currentColumn: GenericIndexPatternColumn) {
        if (!('references' in currentColumn)) return;
        currentColumn.references.forEach((referenceColumnId) => {
          let referencedColumn = columns[referenceColumnId];
          const hasFilter = referencedColumn.filter;
          const referenceDef = operationDefinitionMap[column.operationType];
          if (referenceDef.filterable && !hasFilter) {
            referencedColumn = { ...referencedColumn, filter: column.filter };
            columns[referenceColumnId] = referencedColumn;
          }
          if (!hasFilter) {
            // only push through the current filter if the current level doesn't have its own
            setFilterForAllReferences(referencedColumn);
          }
        });
      }
      setFilterForAllReferences(column);
    }

    if ('references' in column && rootDef.shiftable && column.timeShift) {
      // inherit time shift to all referenced operations
      function setTimeShiftForAllReferences(currentColumn: GenericIndexPatternColumn) {
        if (!('references' in currentColumn)) return;
        currentColumn.references.forEach((referenceColumnId) => {
          let referencedColumn = columns[referenceColumnId];
          const hasShift = referencedColumn.timeShift;
          const referenceDef = operationDefinitionMap[column.operationType];
          if (referenceDef.shiftable && !hasShift) {
            referencedColumn = { ...referencedColumn, timeShift: column.timeShift };
            columns[referenceColumnId] = referencedColumn;
          }
          if (!hasShift) {
            // only push through the current time shift if the current level doesn't have its own
            setTimeShiftForAllReferences(referencedColumn);
          }
        });
      }
      setTimeShiftForAllReferences(column);
    }
  });

  const columnEntries = columnOrder.map((colId) => [colId, columns[colId]] as const);

  const [referenceEntries, esAggEntries] = partition(
    columnEntries,
    ([, col]) =>
      operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
      operationDefinitionMap[col.operationType]?.input === 'managedReference'
  );
  const hasDateHistogram = columnEntries.some(([, c]) => c.operationType === 'date_histogram');

  if (referenceEntries.length || esAggEntries.length) {
    let aggs: ExpressionAstExpressionBuilder[] = [];
    const expressions: ExpressionAstFunction[] = [];

    sortedReferences(referenceEntries).forEach((colId) => {
      const col = columns[colId];
      const def = operationDefinitionMap[col.operationType];
      if (def.input === 'fullReference' || def.input === 'managedReference') {
        expressions.push(...def.toExpression(layer, colId, indexPattern));
      }
    });

    const orderedColumnIds = esAggEntries.map(([colId]) => colId);
    let esAggsIdMap: Record<string, OriginalColumn[]> = {};
    const aggExpressionToEsAggsIdMap: Map<ExpressionAstExpressionBuilder, string> = new Map();
    esAggEntries.forEach(([colId, col], index) => {
      const def = operationDefinitionMap[col.operationType];
      if (def.input !== 'fullReference' && def.input !== 'managedReference') {
        const aggId = String(index);

        const wrapInFilter = Boolean(def.filterable && col.filter);
        const wrapInTimeFilter =
          def.canReduceTimeRange &&
          !hasDateHistogram &&
          col.reducedTimeRange &&
          indexPattern.timeFieldName;
        let aggAst = def.toEsAggsFn(
          col,
          wrapInFilter || wrapInTimeFilter ? `${aggId}-metric` : aggId,
          indexPattern,
          layer,
          uiSettings,
          orderedColumnIds,
          operationDefinitionMap
        );
        if (wrapInFilter || wrapInTimeFilter) {
          aggAst = buildExpressionFunction<AggFunctionsMapping['aggFilteredMetric']>(
            'aggFilteredMetric',
            {
              id: String(index),
              enabled: true,
              schema: 'metric',
              customBucket: buildExpression([
                buildExpressionFunction<AggFunctionsMapping['aggFilter']>('aggFilter', {
                  id: `${index}-filter`,
                  enabled: true,
                  schema: 'bucket',
                  filter: col.filter && queryToAst(col.filter),
                  timeWindow: wrapInTimeFilter ? col.reducedTimeRange : undefined,
                  timeShift: col.timeShift,
                }),
              ]),
              customMetric: buildExpression({ type: 'expression', chain: [aggAst] }),
              timeShift: col.timeShift,
            }
          ).toAst();
        }

        const expressionBuilder = buildExpression({
          type: 'expression',
          chain: [aggAst],
        });
        aggs.push(expressionBuilder);

        const esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
          ? `col-${index + (col.isBucketed ? 0 : 1)}-${aggId}`
          : `col-${index}-${aggId}`;

        esAggsIdMap[esAggsId] = [
          {
            ...col,
            id: colId,
          },
        ];

        aggExpressionToEsAggsIdMap.set(expressionBuilder, esAggsId);
      }
    });

    if (window.ELASTIC_LENS_DELAY_SECONDS) {
      aggs.push(
        buildExpression({
          type: 'expression',
          chain: [
            buildExpressionFunction('aggShardDelay', {
              id: 'the-delay',
              enabled: true,
              schema: 'metric',
              delay: `${window.ELASTIC_LENS_DELAY_SECONDS}s`,
            }).toAst(),
          ],
        })
      );
    }

    const allOperations = uniq(
      esAggEntries.map(([_, column]) => operationDefinitionMap[column.operationType])
    );

    // De-duplicate aggs for supported operations
    const dedupedResult = dedupeAggs(aggs, esAggsIdMap, aggExpressionToEsAggsIdMap, allOperations);
    aggs = dedupedResult.aggs;
    esAggsIdMap = dedupedResult.esAggsIdMap;

    // Apply any operation-specific custom optimizations
    allOperations.forEach((operation) => {
      const optimizeAggs = operation.optimizeEsAggs?.bind(operation);
      if (optimizeAggs) {
        const { aggs: newAggs, esAggsIdMap: newIdMap } = optimizeAggs(
          aggs,
          esAggsIdMap,
          aggExpressionToEsAggsIdMap
        );

        aggs = newAggs;
        esAggsIdMap = newIdMap;
      }
    });

    /*
      Update ID mappings with new agg array positions.

      Given this esAggs-ID-to-original-column map after percentile (for example) optimization:
      col-0-0:    column1
      col-?-1.34: column2 (34th percentile)
      col-2-2:    column3
      col-?-1.98: column4 (98th percentile)

      and this array of aggs
      0: { id: 0 }
      1: { id: 2 }
      2: { id: 1 }

      We need to update the anticipated agg indicies to match the aggs array:
      col-0-0:    column1
      col-2-1.34: column2 (34th percentile)
      col-1-2:    column3
      col-3-3.98: column4 (98th percentile)
    */

    const updatedEsAggsIdMap: Record<string, OriginalColumn[]> = {};
    let counter = 0;

    const esAggsIds = Object.keys(esAggsIdMap);
    aggs.forEach((builder) => {
      const esAggId = builder.functions[0].getArgument('id')?.[0];
      const matchingEsAggColumnIds = esAggsIds.filter((id) => extractAggId(id) === esAggId);

      matchingEsAggColumnIds.forEach((currentId) => {
        const currentColumn = esAggsIdMap[currentId][0];
        const aggIndex = window.ELASTIC_LENS_DELAY_SECONDS
          ? counter + (currentColumn.isBucketed ? 0 : 1)
          : counter;
        const newId = updatePositionIndex(currentId, aggIndex);
        updatedEsAggsIdMap[newId] = esAggsIdMap[currentId];

        counter++;
      });
    });

    const columnsWithFormatters = columnEntries.filter(
      ([, col]) =>
        (isColumnOfType<RangeIndexPatternColumn>('range', col) && col.params?.parentFormat) ||
        (isColumnFormatted(col) && col.params?.format)
    ) as Array<[string, RangeIndexPatternColumn | FormattedIndexPatternColumn]>;
    const formatterOverrides: ExpressionAstFunction[] = columnsWithFormatters.map(([id, col]) => {
      // TODO: improve the type handling here
      const parentFormat = 'parentFormat' in col.params! ? col.params!.parentFormat! : undefined;
      const format = col.params!.format;

      const base: ExpressionAstFunction = {
        type: 'function',
        function: 'lens_format_column',
        arguments: {
          format: format ? [format.id] : [''],
          columnId: [id],
          decimals: typeof format?.params?.decimals === 'number' ? [format.params.decimals] : [],
          suffix:
            format?.params && 'suffix' in format.params && format.params.suffix
              ? [format.params.suffix]
              : [],
          parentFormat: parentFormat ? [JSON.stringify(parentFormat)] : [],
        },
      };

      return base;
    });

    const firstDateHistogramColumn = columnEntries.find(
      ([, col]) => col.operationType === 'date_histogram'
    );

    const columnsWithTimeScale = columnEntries.filter(
      ([, col]) =>
        col.timeScale &&
        operationDefinitionMap[col.operationType].timeScalingMode &&
        operationDefinitionMap[col.operationType].timeScalingMode !== 'disabled'
    );

    const timeScaleFunctions: ExpressionAstFunction[] = columnsWithTimeScale.flatMap(
      ([id, col]) => {
        const scalingCall: ExpressionAstFunction = {
          type: 'function',
          function: 'lens_time_scale',
          arguments: {
            dateColumnId: firstDateHistogramColumn?.length ? [firstDateHistogramColumn[0]] : [],
            inputColumnId: [id],
            outputColumnId: [id],
            outputColumnName: [col.label],
            targetUnit: [col.timeScale!],
            reducedTimeRange: col.reducedTimeRange ? [col.reducedTimeRange] : [],
          },
        };

        const formatCall: ExpressionAstFunction = {
          type: 'function',
          function: 'lens_format_column',
          arguments: {
            format: [''],
            columnId: [id],
            parentFormat: [JSON.stringify({ id: 'suffix', params: { unit: col.timeScale } })],
          },
        };

        return [scalingCall, formatCall];
      }
    );

    if (esAggEntries.length === 0) {
      return {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'createTable',
            arguments: {
              ids: [],
              names: [],
              rowCount: [1],
            },
          },
          ...expressions,
          ...formatterOverrides,
          ...timeScaleFunctions,
        ],
      };
    }

    const allDateHistogramFields = Object.values(columns)
      .map((column) =>
        isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column) &&
        !column.params.ignoreTimeRange
          ? column.sourceField
          : null
      )
      .filter((field): field is string => Boolean(field));

    return {
      type: 'expression',
      chain: [
        { type: 'function', function: 'kibana', arguments: {} },
        buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
          index: buildExpression([
            buildExpressionFunction<IndexPatternLoadExpressionFunctionDefinition>(
              'indexPatternLoad',
              { id: indexPattern.id }
            ),
          ]),
          aggs,
          metricsAtAllLevels: false,
          partialRows: false,
          timeFields: allDateHistogramFields,
          probability: layer.sampling || 1,
          samplerSeed: seedrandom(searchSessionId).int32(),
        }).toAst(),
        {
          type: 'function',
          function: 'lens_map_to_columns',
          arguments: {
            idMap: [JSON.stringify(updatedEsAggsIdMap)],
          },
        },
        ...expressions,
        ...formatterOverrides,
        ...timeScaleFunctions,
      ],
    };
  }

  return null;
}

// Topologically sorts references so that we can execute them in sequence
function sortedReferences(columns: Array<readonly [string, GenericIndexPatternColumn]>) {
  const allNodes: Record<string, string[]> = {};
  columns.forEach(([id, col]) => {
    allNodes[id] = 'references' in col ? col.references : [];
  });
  // remove real metric references
  columns.forEach(([id]) => {
    allNodes[id] = allNodes[id].filter((refId) => !!allNodes[refId]);
  });
  const ordered: string[] = [];

  while (ordered.length < columns.length) {
    Object.keys(allNodes).forEach((id) => {
      if (allNodes[id].length === 0) {
        ordered.push(id);
        delete allNodes[id];
        Object.keys(allNodes).forEach((k) => {
          allNodes[k] = allNodes[k].filter((i) => i !== id);
        });
      }
    });
  }

  return ordered;
}

export function toExpression(
  state: FormBasedPrivateState,
  layerId: string,
  indexPatterns: IndexPatternMap,
  uiSettings: IUiSettingsClient,
  searchSessionId?: string
) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(
      state.layers[layerId],
      indexPatterns[state.layers[layerId].indexPatternId],
      uiSettings,
      searchSessionId
    );
  }

  return null;
}

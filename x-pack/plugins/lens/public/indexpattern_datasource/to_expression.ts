/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast, ExpressionFunctionAST } from '@kbn/interpreter/common';
import { IndexPatternColumn } from './indexpattern';
import { operationDefinitionMap } from './operations';
import { IndexPattern, IndexPatternPrivateState } from './types';
import { OriginalColumn } from './rename_columns';
import { dateHistogramOperation } from './operations/definitions';

function getExpressionForLayer(
  indexPattern: IndexPattern,
  columns: Record<string, IndexPatternColumn>,
  columnOrder: string[]
): Ast | null {
  if (columnOrder.length === 0) {
    return null;
  }

  function getEsAggsConfig<C extends IndexPatternColumn>(column: C, columnId: string) {
    return operationDefinitionMap[column.operationType].toEsAggsConfig(
      column,
      columnId,
      indexPattern
    );
  }

  const columnEntries = columnOrder.map((colId) => [colId, columns[colId]] as const);
  const bucketsCount = columnEntries.filter(([, entry]) => entry.isBucketed).length;
  const metricsCount = columnEntries.length - bucketsCount;

  if (columnEntries.length) {
    const aggs = columnEntries.map(([colId, col]) => {
      return getEsAggsConfig(col, colId);
    });

    /**
     * Because we are turning on metrics at all levels, the sequence generation
     * logic here is more complicated. Examples follow:
     *
     * Example 1: [Count]
     * Output: [`col-0-count`]
     *
     * Example 2: [Terms, Terms, Count]
     * Output: [`col-0-terms0`, `col-2-terms1`, `col-3-count`]
     *
     * Example 3: [Terms, Terms, Count, Max]
     * Output: [`col-0-terms0`, `col-3-terms1`, `col-4-count`, `col-5-max`]
     */
    const idMap = columnEntries.reduce((currentIdMap, [colId, column], index) => {
      const newIndex = column.isBucketed
        ? index * (metricsCount + 1) // Buckets are spaced apart by N + 1
        : (index ? index + 1 : 0) - bucketsCount + (bucketsCount - 1) * (metricsCount + 1);
      return {
        ...currentIdMap,
        [`col-${columnEntries.length === 1 ? 0 : newIndex}-${colId}`]: {
          ...column,
          id: colId,
        },
      };
    }, {} as Record<string, OriginalColumn>);

    type FormattedColumn = Required<Extract<IndexPatternColumn, { params?: { format: unknown } }>>;

    const columnsWithFormatters = columnEntries.filter(
      ([, col]) => col.params && 'format' in col.params && col.params.format
    ) as Array<[string, FormattedColumn]>;
    const formatterOverrides: ExpressionFunctionAST[] = columnsWithFormatters.map(([id, col]) => {
      const format = (col as FormattedColumn).params!.format;
      const base: ExpressionFunctionAST = {
        type: 'function',
        function: 'lens_format_column',
        arguments: {
          format: [format.id],
          columnId: [id],
        },
      };
      if (typeof format.params?.decimals === 'number') {
        return {
          ...base,
          arguments: {
            ...base.arguments,
            decimals: [format.params.decimals],
          },
        };
      }
      return base;
    });

    const allDateHistogramFields = Object.values(columns)
      .map((column) =>
        column.operationType === dateHistogramOperation.type ? column.sourceField : null
      )
      .filter((field): field is string => Boolean(field));

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'esaggs',
          arguments: {
            index: [indexPattern.id],
            metricsAtAllLevels: [true],
            partialRows: [true],
            includeFormatHints: [true],
            timeFields: allDateHistogramFields,
            aggConfigs: [JSON.stringify(aggs)],
          },
        },
        {
          type: 'function',
          function: 'lens_rename_columns',
          arguments: {
            idMap: [JSON.stringify(idMap)],
          },
        },
        ...formatterOverrides,
      ],
    };
  }

  return null;
}

export function toExpression(state: IndexPatternPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(
      state.indexPatterns[state.layers[layerId].indexPatternId],
      state.layers[layerId].columns,
      state.layers[layerId].columnOrder
    );
  }

  return null;
}

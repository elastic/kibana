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
  columnOrder: string[],
  tree: IndexPatternColumn
): Ast | null {
  if (columnOrder.length === 0) {
    return null;
  }

  function getEsAggsConfig<C extends IndexPatternColumn>(column: C, columnId: string) {
    return operationDefinitionMap[column.operationType].toEsAggsConfig!(column, columnId);
  }

  const esAggsColumnEntries = [];
  const nodeQueue = [tree];
  const clientSideOperations = [];
  const handledClientSideNodes: Record<string, boolean> = {};

  while (nodeQueue.length > 0) {
    const currentNode = nodeQueue.shift();
    if (!currentNode!.isClientSideOperation) {
      esAggsColumnEntries.push([currentNode!.id, currentNode]);
    } else {
      if (!handledClientSideNodes[currentNode!.id]) {
        clientSideOperations.push(currentNode);
      }
      handledClientSideNodes[currentNode!.id] = true;
      (currentNode.children || []).forEach((childNode) => {
        handledClientSideNodes[childNode.id] = true;
      });
    }
    nodeQueue.push(...(currentNode.children || []));
  }

  const bucketsCount = esAggsColumnEntries.filter(([, entry]) => entry!.isBucketed).length;
  const metricsCount = esAggsColumnEntries.length - bucketsCount;

  if (esAggsColumnEntries.length) {
    const aggs = esAggsColumnEntries.map(([colId, col]) => {
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
    const idMap = esAggsColumnEntries.reduce((currentIdMap, [colId, column], index) => {
      const newIndex = column.isBucketed
        ? index * (metricsCount + 1) // Buckets are spaced apart by N + 1
        : (index ? index + 1 : 0) - bucketsCount + (bucketsCount - 1) * (metricsCount + 1);
      return {
        ...currentIdMap,
        [`col-${esAggsColumnEntries.length === 1 ? 0 : newIndex}-${colId}`]: {
          ...column,
          id: colId,
        },
      };
    }, {} as Record<string, OriginalColumn>);

    type FormattedColumn = Required<Extract<IndexPatternColumn, { params?: { format: unknown } }>>;

    const columnsWithFormatters = esAggsColumnEntries.filter(
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

    const clientSideExpressions = clientSideOperations.map((node) => {
      return {
        type: 'function',
        function: 'lens_client_calculations',
        arguments: {
          // todo strip all unused stuff from the subtree
          tree: [JSON.stringify(node)],
        },
      };
    });

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
        ...clientSideExpressions,
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
      state.layers[layerId].columnOrder,
      state.layers[layerId].tree
    );
  }

  return null;
}

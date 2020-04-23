/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Ast, ExpressionFunctionAST } from '@kbn/interpreter/common';
import { IndexPatternColumn } from './indexpattern';
import { operationDefinitionMap } from './operations';
import { IndexPattern, IndexPatternPrivateState } from './types';
import { OriginalColumn } from './rename_columns';

function getExpressionForLayer(
  indexPattern: IndexPattern,
  columns: Record<string, IndexPatternColumn>,
  columnOrder: string[]
): Ast | null {
  if (columnOrder.length === 0) {
    return null;
  }

  function getEsAggsConfig<C extends IndexPatternColumn>(column: C, columnId: string) {
    return operationDefinitionMap[column.operationType].toEsAggsConfig(column, columnId);
  }

  const columnEntries = columnOrder.map(colId => [colId, columns[colId]] as const);

  if (columnEntries.length) {
    const aggs = columnEntries.map(([colId, col]) => {
      return getEsAggsConfig(col, colId);
    });

    const idMap = columnEntries.reduce((currentIdMap, [colId], index) => {
      return {
        ...currentIdMap,
        [`col-${index}-${colId}`]: {
          ...columns[colId],
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

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'esaggs',
          arguments: {
            index: [indexPattern.id],
            metricsAtAllLevels: [false],
            partialRows: [false],
            includeFormatHints: [true],
            aggConfigs: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: 'lens_auto_date',
                    arguments: {
                      aggConfigs: [JSON.stringify(aggs)],
                    },
                  },
                ],
              },
            ],
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

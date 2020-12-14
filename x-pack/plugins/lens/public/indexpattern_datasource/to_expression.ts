/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EsaggsExpressionFunctionDefinition,
  IndexPatternLoadExpressionFunctionDefinition,
} from '../../../../../src/plugins/data/public';
import {
  buildExpression,
  buildExpressionFunction,
  ExpressionAstExpression,
  ExpressionAstExpressionBuilder,
  ExpressionAstFunction,
} from '../../../../../src/plugins/expressions/public';
import { IndexPatternColumn } from './indexpattern';
import { operationDefinitionMap } from './operations';
import { IndexPattern, IndexPatternPrivateState, IndexPatternLayer } from './types';
import { OriginalColumn } from './rename_columns';
import { dateHistogramOperation } from './operations/definitions';

function getExpressionForLayer(
  layer: IndexPatternLayer,
  indexPattern: IndexPattern
): ExpressionAstExpression | null {
  const { columns, columnOrder } = layer;
  if (columnOrder.length === 0) {
    return null;
  }

  const columnEntries = columnOrder.map((colId) => [colId, columns[colId]] as const);

  if (columnEntries.length) {
    const aggs: ExpressionAstExpressionBuilder[] = [];
    const expressions: ExpressionAstFunction[] = [];
    columnEntries.forEach(([colId, col]) => {
      const def = operationDefinitionMap[col.operationType];
      if (def.input === 'fullReference') {
        expressions.push(...def.toExpression(layer, colId, indexPattern));
      } else {
        aggs.push(
          buildExpression({ type: 'expression', chain: [def.toEsAggsFn(col, colId, indexPattern)] })
        );
      }
    });

    const idMap = columnEntries.reduce((currentIdMap, [colId, column], index) => {
      return {
        ...currentIdMap,
        [`col-${columnEntries.length === 1 ? 0 : index}-${colId}`]: {
          ...column,
          id: colId,
        },
      };
    }, {} as Record<string, OriginalColumn>);

    type FormattedColumn = Required<
      Extract<
        IndexPatternColumn,
        | {
            params?: {
              format: unknown;
            };
          }
        // when formatters are nested there's a slightly different format
        | {
            params: {
              format?: unknown;
              parentFormat?: unknown;
            };
          }
      >
    >;
    const columnsWithFormatters = columnEntries.filter(
      ([, col]) =>
        col.params &&
        (('format' in col.params && col.params.format) ||
          ('parentFormat' in col.params && col.params.parentFormat))
    ) as Array<[string, FormattedColumn]>;
    const formatterOverrides: ExpressionAstFunction[] = columnsWithFormatters.map(
      ([id, col]: [string, FormattedColumn]) => {
        // TODO: improve the type handling here
        const parentFormat = 'parentFormat' in col.params ? col.params!.parentFormat! : undefined;
        const format = (col as FormattedColumn).params!.format;

        const base: ExpressionAstFunction = {
          type: 'function',
          function: 'lens_format_column',
          arguments: {
            format: format ? [format.id] : [''],
            columnId: [id],
            decimals: typeof format?.params?.decimals === 'number' ? [format.params.decimals] : [],
            parentFormat: parentFormat ? [JSON.stringify(parentFormat)] : [],
          },
        };

        return base;
      }
    );

    const firstDateHistogramColumn = columnEntries.find(
      ([, col]) => col.operationType === 'date_histogram'
    );

    const columnsWithTimeScale = firstDateHistogramColumn
      ? columnEntries.filter(
          ([, col]) =>
            col.timeScale &&
            operationDefinitionMap[col.operationType].timeScalingMode &&
            operationDefinitionMap[col.operationType].timeScalingMode !== 'disabled'
        )
      : [];
    const timeScaleFunctions: ExpressionAstFunction[] = columnsWithTimeScale.flatMap(
      ([id, col]) => {
        const scalingCall: ExpressionAstFunction = {
          type: 'function',
          function: 'lens_time_scale',
          arguments: {
            dateColumnId: [firstDateHistogramColumn![0]],
            inputColumnId: [id],
            outputColumnId: [id],
            targetUnit: [col.timeScale!],
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

    const allDateHistogramFields = Object.values(columns)
      .map((column) =>
        column.operationType === dateHistogramOperation.type ? column.sourceField : null
      )
      .filter((field): field is string => Boolean(field));

    return {
      type: 'expression',
      chain: [
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
        }).toAst(),
        {
          type: 'function',
          function: 'lens_rename_columns',
          arguments: {
            idMap: [JSON.stringify(idMap)],
          },
        },
        ...formatterOverrides,
        ...expressions,
        ...timeScaleFunctions,
      ],
    };
  }

  return null;
}

export function toExpression(state: IndexPatternPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(
      state.layers[layerId],
      state.indexPatterns[state.layers[layerId].indexPatternId]
    );
  }

  return null;
}

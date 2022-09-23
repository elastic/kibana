/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggFunctionsMapping,
  ExpressionFunctionKql,
  ExpressionFunctionLucene,
} from '@kbn/data-plugin/public';
import {
  AnyExpressionFunctionDefinition,
  ExpressionAstExpressionBuilder,
  ExpressionAstFunctionBuilder,
} from '@kbn/expressions-plugin/common';
import { Primitive } from 'utility-types';
import { GenericOperationDefinition } from './operations';
import { extractAggId, OriginalColumn } from './to_expression';

/**
 * Computes a group-by key for an agg expression builder based on distinctive expression function arguments
 */
export const getGroupByKey = (
  agg: ExpressionAstExpressionBuilder,
  aggNames: string[],
  importantExpressionArgs: Array<{ name: string; transformer?: (value: Primitive) => string }>
) => {
  const {
    functions: [fnBuilder],
  } = agg;

  const pieces = [];

  if (aggNames.includes(fnBuilder.name)) {
    pieces.push(fnBuilder.name);

    importantExpressionArgs.forEach(({ name, transformer }) => {
      const arg = fnBuilder.getArgument(name)?.[0];
      pieces.push(transformer ? transformer(arg) : arg);
    });

    pieces.push(fnBuilder.getArgument('timeShift')?.[0]);
  }

  if (fnBuilder.name === 'aggFilteredMetric') {
    const metricFnBuilder = fnBuilder.getArgument('customMetric')?.[0].functions[0] as
      | ExpressionAstFunctionBuilder<AnyExpressionFunctionDefinition>
      | undefined;

    if (metricFnBuilder && aggNames.includes(metricFnBuilder.name)) {
      pieces.push(metricFnBuilder.name);
      pieces.push('filtered');

      const aggFilterFnBuilder = (
        fnBuilder.getArgument('customBucket')?.[0] as ExpressionAstExpressionBuilder
      ).functions[0] as ExpressionAstFunctionBuilder<AggFunctionsMapping['aggFilter']>;

      importantExpressionArgs.forEach(({ name, transformer }) => {
        const arg = metricFnBuilder.getArgument(name)?.[0];
        pieces.push(transformer ? transformer(arg) : arg);
      });

      pieces.push(aggFilterFnBuilder.getArgument('timeWindow'));
      pieces.push(fnBuilder.getArgument('timeShift'));

      const filterExpression = aggFilterFnBuilder.getArgument('filter')?.[0] as
        | ExpressionAstExpressionBuilder
        | undefined;

      if (filterExpression) {
        const filterFnBuilder = filterExpression.functions[0] as
          | ExpressionAstFunctionBuilder<ExpressionFunctionKql | ExpressionFunctionLucene>
          | undefined;

        pieces.push(filterFnBuilder?.name, filterFnBuilder?.getArgument('q')?.[0]);
      }
    }
  }

  return pieces.length ? pieces.map(String).join('-') : undefined;
};

function groupByKey<T>(items: T[], getKey: (item: T) => string | undefined): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  items.forEach((item) => {
    const key = getKey(item);
    if (key) {
      if (!(key in groups)) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
  });

  return groups;
}

/**
 * Consolidates duplicate agg expression builders to increase performance
 */
export function dedupeAggs(
  _aggs: ExpressionAstExpressionBuilder[],
  _esAggsIdMap: Record<string, OriginalColumn[]>,
  aggExpressionToEsAggsIdMap: Map<ExpressionAstExpressionBuilder, string>,
  allOperations: GenericOperationDefinition[]
): {
  aggs: ExpressionAstExpressionBuilder[];
  esAggsIdMap: Record<string, OriginalColumn[]>;
} {
  let aggs = [..._aggs];
  const esAggsIdMap = { ..._esAggsIdMap };

  const aggsByArgs = groupByKey<ExpressionAstExpressionBuilder>(aggs, (expressionBuilder) => {
    for (const operation of allOperations) {
      const groupKey = operation.getGroupByKey?.(expressionBuilder);
      if (groupKey) {
        return `${operation.type}-${groupKey}`;
      }
    }
  });

  const termsFuncs = aggs
    .map((agg) => agg.functions[0])
    .filter((func) => func.name === 'aggTerms') as Array<
    ExpressionAstFunctionBuilder<AggFunctionsMapping['aggTerms']>
  >;

  // collapse each group into a single agg expression builder
  Object.values(aggsByArgs).forEach((expressionBuilders) => {
    if (expressionBuilders.length <= 1) {
      // don't need to optimize if there aren't more than one
      return;
    }

    const [firstExpressionBuilder, ...restExpressionBuilders] = expressionBuilders;

    // throw away all but the first expression builder
    aggs = aggs.filter((aggBuilder) => !restExpressionBuilders.includes(aggBuilder));

    const firstEsAggsId = aggExpressionToEsAggsIdMap.get(firstExpressionBuilder);
    if (firstEsAggsId === undefined) {
      throw new Error('Could not find current column ID for expression builder');
    }

    restExpressionBuilders.forEach((expressionBuilder) => {
      const currentEsAggsId = aggExpressionToEsAggsIdMap.get(expressionBuilder);
      if (currentEsAggsId === undefined) {
        throw new Error('Could not find current column ID for expression builder');
      }

      esAggsIdMap[firstEsAggsId].push(...esAggsIdMap[currentEsAggsId]);

      delete esAggsIdMap[currentEsAggsId];

      termsFuncs.forEach((func) => {
        if (func.getArgument('orderBy')?.[0] === extractAggId(currentEsAggsId)) {
          func.replaceArgument('orderBy', [extractAggId(firstEsAggsId)]);
        }
      });
    });
  });

  return { aggs, esAggsIdMap };
}

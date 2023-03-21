/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggFunctionsMapping } from '@kbn/data-plugin/public';
import {
  ExpressionAstExpressionBuilder,
  ExpressionAstFunctionBuilder,
} from '@kbn/expressions-plugin/common';
import { GenericOperationDefinition } from './operations';
import { groupByKey } from './operations/definitions/get_group_by_key';
import { extractAggId, OriginalColumn } from './to_expression';

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

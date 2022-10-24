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

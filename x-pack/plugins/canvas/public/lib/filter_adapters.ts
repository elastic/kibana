/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast, ExpressionFunctionAST, toExpression } from '@kbn/interpreter/common';
import { identity } from 'lodash';
import { ExpressionAstArgument, Filter, FilterType } from '../../types';

const functionToFilter: Record<string, FilterType> = {
  timefilter: FilterType.time,
  exactly: FilterType.exactly,
};

const filterToFunction: Record<FilterType, string> = {
  [FilterType.time]: 'timefilter',
  [FilterType.exactly]: 'exactly',
  [FilterType.luceneQueryString]: 'lucene',
};

const defaultFormatter = (arg: ExpressionAstArgument) => arg.toString();

const argToValue = (
  arg: ExpressionAstArgument[],
  formatter: (arg: ExpressionAstArgument) => string | null = defaultFormatter
) => (arg?.[0] ? formatter(arg[0]) : null);

const convertFunctionToFilterType = (func: string) => functionToFilter[func] ?? FilterType.exactly;

const collectArgs = (args: ExpressionFunctionAST['arguments']) => {
  const argsKeys = Object.keys(args);

  if (!argsKeys.length) {
    return null;
  }

  return argsKeys.reduce<Record<string, unknown>>(
    (acc, key) => ({ ...acc, [key]: argToValue(args[key], identity) }),
    {}
  );
};

export function adaptCanvasFilter(filter: ExpressionFunctionAST, id: string | number): Filter {
  const { function: type, arguments: args } = filter;
  const { column, filterGroup, value: valueArg, type: typeArg, ...rest } = args ?? {};
  return {
    id,
    type: convertFunctionToFilterType(type),
    column: argToValue(column),
    filterGroup: argToValue(filterGroup),
    value: argToValue(valueArg) ?? collectArgs(rest),
  };
}

export const tranformObjectToArgs = (obj: Record<string, unknown>) =>
  Object.keys(obj).reduce<Record<string, Array<string | number>>>((args, key) => {
    const value = obj[key];
    const adaptedValue = Array.isArray(value) ? value : [value];
    return { ...args, [key]: adaptedValue };
  }, {});

export function adaptFilterToExpression(filter: Filter) {
  const { type, id, value, ...rest } = filter;
  const restOfExpression = tranformObjectToArgs({ ...rest });
  const valueArgs =
    value !== null && typeof value === 'object'
      ? tranformObjectToArgs({ ...value })
      : tranformObjectToArgs({ value });

  const exprAst: Ast = {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: filterToFunction[type],
        arguments: { ...restOfExpression, ...valueArgs },
      },
    ],
  };

  return toExpression(exprAst);
}

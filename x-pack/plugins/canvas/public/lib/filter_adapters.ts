/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AstFunction } from '@kbn/interpreter';
import { identity } from 'lodash';
import { ExpressionAstArgument, Filter, FilterType } from '../../types';

const functionToFilter: Record<string, FilterType> = {
  timefilter: FilterType.time,
  exactly: FilterType.exactly,
};

const defaultFormatter = (arg: ExpressionAstArgument) => arg.toString();

const argToValue = (
  arg: ExpressionAstArgument[],
  formatter: (arg: ExpressionAstArgument) => string | null = defaultFormatter
) => (arg?.[0] ? formatter(arg[0]) : null);

const convertFunctionToFilterType = (func: string) => functionToFilter[func] ?? FilterType.exactly;

const collectArgs = (args: AstFunction['arguments']) => {
  const argsKeys = Object.keys(args);

  if (!argsKeys.length) {
    return null;
  }

  return argsKeys.reduce<Record<string, unknown>>(
    (acc, key) => ({ ...acc, [key]: argToValue(args[key], identity) }),
    {}
  );
};

export function adaptCanvasFilter(filter: AstFunction): Filter {
  const { function: type, arguments: args } = filter;
  const { column, filterGroup, value: valueArg, type: typeArg, ...rest } = args ?? {};
  return {
    type: convertFunctionToFilterType(type),
    column: argToValue(column),
    filterGroup: argToValue(filterGroup),
    value: argToValue(valueArg) ?? collectArgs(rest),
  };
}

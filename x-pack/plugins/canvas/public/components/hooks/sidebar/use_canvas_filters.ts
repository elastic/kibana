/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionAST, fromExpression } from '@kbn/interpreter/common';
import { identity } from 'lodash';
import { shallowEqual, useSelector } from 'react-redux';
import { ExpressionAstArgument, Filter, FilterType, State } from '../../../../types';
import { getGlobalFilters } from '../../../state/selectors/workpad';

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

export function adaptCanvasFilter(filter: ExpressionFunctionAST): Filter {
  const { function: type, arguments: args } = filter;
  const { column, filterGroup, value, ...rest } = args ?? {};
  return {
    type: convertFunctionToFilterType(type),
    column: argToValue(column),
    filterGroup: argToValue(filterGroup),
    value:
      argToValue(value) ??
      Object.keys(rest).reduce<Record<string, unknown>>(
        (acc, key) => ({
          ...acc,
          [key]: argToValue(rest[key], identity),
        }),
        {}
      ),
  };
}

const extractExpressionAST = (filtersExpressions: string[]) =>
  fromExpression(filtersExpressions.join(' | '));

export function useCanvasFilters() {
  const filterExpressions = useSelector((state: State) => getGlobalFilters(state), shallowEqual);
  const expression = extractExpressionAST(filterExpressions);
  const filters = expression.chain.map(adaptCanvasFilter);

  return filters;
}

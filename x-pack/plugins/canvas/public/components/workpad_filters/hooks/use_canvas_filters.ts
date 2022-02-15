/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AstFunction, fromExpression } from '@kbn/interpreter';
import { shallowEqual, useSelector } from 'react-redux';
import { State } from '../../../../types';
import { getFiltersByFilterExpressions } from '../../../lib/filter';
import { adaptCanvasFilter } from '../../../lib/filter_adapters';
import { useFiltersService } from '../../../services';

const extractExpressionAST = (filters: string[]) => fromExpression(filters.join(' | '));

export function useCanvasFilters(filterExprsToGroupBy: AstFunction[] = []) {
  const filtersService = useFiltersService();
  const filterExpressions = useSelector(
    (state: State) => filtersService.getFilters(state),
    shallowEqual
  );
  const filtersByGroups = getFiltersByFilterExpressions(filterExpressions, filterExprsToGroupBy);

  const expression = extractExpressionAST(filtersByGroups);
  const filters = expression.chain.map(adaptCanvasFilter);

  return filters;
}

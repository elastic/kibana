/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression } from '@kbn/interpreter/common';
import { shallowEqual, useSelector } from 'react-redux';
import { State } from '../../../../types';
import { getFiltersByGroups } from '../../../lib/filter';
import { adaptCanvasFilter } from '../../../lib/filter_adapters';
import { useFiltersService } from '../../../services';

const extractExpressionAST = (filtersExpressions: string[]) =>
  fromExpression(filtersExpressions.join(' | '));

export function useCanvasFilters(groups: string[] = [], ungrouped: boolean = false) {
  const filtersService = useFiltersService();
  const filterExpressions = useSelector(
    (state: State) => filtersService.getFilters(state),
    shallowEqual
  );
  const filtersByGroups = getFiltersByGroups(filterExpressions, groups, ungrouped);

  const expression = extractExpressionAST(filtersByGroups);
  const filters = expression.chain.map(adaptCanvasFilter);

  return filters;
}

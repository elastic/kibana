/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression } from '@kbn/interpreter/common';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import deepEqual from 'react-fast-compare';
import { State } from '../../../../types';
import { getFiltersByGroups } from '../../../lib/filter';
import { adaptCanvasFilter, adaptFilterToExpression } from '../../../lib/filter_adapters';
import { getGlobalFiltersWithIds } from '../../../state/selectors/workpad';
// @ts-expect-error untyped local
import { setFilter } from '../../../state/actions/elements';

const extractExpressionAST = (filtersExpressions: string[]) =>
  fromExpression(filtersExpressions.join(' | '));

export function useCanvasFilters(groups?: string[]) {
  const filterExpressions = useSelector(
    (state: State) => getGlobalFiltersWithIds(state),
    deepEqual
  );

  const filtersByGroups = groups?.length
    ? getFiltersByGroups(filterExpressions, groups)
    : filterExpressions;

  const expression = extractExpressionAST(filtersByGroups.map(({ filter }) => filter));
  const filters = expression.chain.map((filter, index) =>
    adaptCanvasFilter(filter, filtersByGroups[index].id)
  );
  return filters;
}

export function useCanvasFiltersActions() {
  const dispatch = useDispatch();
  const updateFilter = useCallback(
    (filter) => {
      const filterExpression = adaptFilterToExpression(filter);
      dispatch(setFilter(filterExpression, filter.id));
    },
    [dispatch]
  );

  return {
    updateFilter,
  };
}

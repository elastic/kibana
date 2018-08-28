/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { fromKueryExpression } from 'ui/kuery';

import { LogFilterState } from './reducer';

export const selectLogFilterQuery = (state: LogFilterState) => state.filterQuery;

export const selectIsLogFilterQueryValid = createSelector(selectLogFilterQuery, filterQuery => {
  if (filterQuery && filterQuery.kind === 'kuery') {
    try {
      fromKueryExpression(filterQuery.expression);
    } catch (err) {
      return false;
    }
  }

  return true;
});

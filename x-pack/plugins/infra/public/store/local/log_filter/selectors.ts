/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { fromKueryExpression } from 'ui/kuery';

import { LogFilterState } from './reducer';

export const selectLogFilterQuery = (state: LogFilterState) => state.filterQuery;

export const selectLogFilterQueryDraft = (state: LogFilterState) => state.filterQueryDraft;

export const selectIsLogFilterQueryDraftValid = createSelector(
  selectLogFilterQueryDraft,
  filterQueryDraft => {
    if (filterQueryDraft && filterQueryDraft.kind === 'kuery') {
      try {
        fromKueryExpression(filterQueryDraft.expression);
      } catch (err) {
        return false;
      }
    }

    return true;
  }
);

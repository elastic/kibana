/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { fromKueryExpression } from 'ui/kuery';

import { WaffleFilterState } from './reducer';

export const selectWaffleFilterQuery = (state: WaffleFilterState) => state.filterQuery;

export const selectWaffleFilterQueryDraft = (state: WaffleFilterState) => state.filterQueryDraft;

export const selectIsWaffleFilterQueryDraftValid = createSelector(
  selectWaffleFilterQueryDraft,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { PolicyListState, PolicyDetailsState } from '../../types';

export const selectPolicyItems = (state: PolicyListState) => state.policyItems;

export const selectPolicyDetails = (state: PolicyDetailsState) => state.policyItem;

export const selectPolicyIdFromParams: (state: PolicyDetailsState) => string = createSelector(
  (state: PolicyDetailsState) => state.location,
  (location: PolicyDetailsState['location']) => {
    if (location) {
      return location.pathname.split('/')[2];
    }
    return '';
  }
);

export const selectPageIndex = (state: PolicyListState) => state.pageIndex;

export const selectPageSize = (state: PolicyListState) => state.pageSize;

export const selectTotal = (state: PolicyListState) => state.total;

export const selectIsLoading = (state: PolicyListState) => state.isLoading;

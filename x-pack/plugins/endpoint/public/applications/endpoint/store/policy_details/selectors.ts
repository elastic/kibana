/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { PolicyDetailsState } from '../../types';

export const selectPolicyDetails = (state: PolicyDetailsState) => state.policyItem;

export const isOnPolicyDetailsPage = (state: PolicyDetailsState) => {
  if (state.location) {
    const pathnameParts = state.location.pathname.split('/');
    return pathnameParts[1] === 'policy' && pathnameParts[2];
  } else {
    return false;
  }
};

export const selectPolicyIdFromParams: (state: PolicyDetailsState) => string = createSelector(
  (state: PolicyDetailsState) => state.location,
  (location: PolicyDetailsState['location']) => {
    if (location) {
      return location.pathname.split('/')[2];
    }
    return '';
  }
);

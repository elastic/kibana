/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { PolicyDetailsState } from '../../types';
import { Immutable } from '../../../../../common/types';

/** Returns the policy details */
export const policyDetails = (state: PolicyDetailsState) => state.policyItem;

/** Returns the policyId from the url */
export const policyIdFromParams: (state: PolicyDetailsState) => string = createSelector(
  (state: PolicyDetailsState) => state.location,
  (location: PolicyDetailsState['location']) => {
    if (location) {
      return location.pathname.split('/')[2];
    }
    return '';
  }
);

/** Returns the policy configuration */
export const policyConfig = (state: Immutable<PolicyDetailsState>) => state.policyConfig;

/** Returns an object of all the windows eventing configuration */
export const windowsEventing = (state: PolicyDetailsState) => {
  const config = policyConfig(state);
  return config && config.windows.eventing;
};

/** Returns the total number of possible windows eventing configurations */
export const totalWindowsEventing = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.keys(config.windows.eventing).length;
  }
  return 0;
};

/** Returns the number of selected windows eventing configurations */
export const selectedWindowsEventing = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.values(config.windows.eventing).reduce((count, event) => {
      return event === true ? count + 1 : count;
    }, 0);
  }
  return 0;
};

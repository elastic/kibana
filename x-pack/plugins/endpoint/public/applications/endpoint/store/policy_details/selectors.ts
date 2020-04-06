/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { PolicyConfig, PolicyDetailsState, UIPolicyConfig } from '../../types';
import { generatePolicy } from '../../models/policy';

/** Returns the policy details */
export const policyDetails = (state: PolicyDetailsState) => state.policyItem;

/** Returns a boolean of whether the user is on the policy details page or not */
export const isOnPolicyDetailsPage = (state: PolicyDetailsState) => {
  if (state.location) {
    const pathnameParts = state.location.pathname.split('/');
    return pathnameParts[1] === 'policy' && pathnameParts[2];
  } else {
    return false;
  }
};

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

/**
 * Returns the full Endpoint Policy, which will include private settings not shown on the UI.
 * Note: this will return a default full policy if the `policyItem` is `undefined`
 */
export const fullPolicy: (s: PolicyDetailsState) => PolicyConfig = createSelector(
  policyDetails,
  policyData => {
    return policyData?.inputs[0]?.config?.policy?.value ?? generatePolicy();
  }
);

const fullWindowsPolicySettings: (
  s: PolicyDetailsState
) => PolicyConfig['windows'] = createSelector(fullPolicy, policy => policy?.windows);

const fullMacPolicySettings: (s: PolicyDetailsState) => PolicyConfig['mac'] = createSelector(
  fullPolicy,
  policy => policy?.mac
);

const fullLinuxPolicySettings: (s: PolicyDetailsState) => PolicyConfig['linux'] = createSelector(
  fullPolicy,
  policy => policy?.linux
);

/** Returns the policy configuration */
export const policyConfig: (s: PolicyDetailsState) => UIPolicyConfig = createSelector(
  fullWindowsPolicySettings,
  fullMacPolicySettings,
  fullLinuxPolicySettings,
  (windows, mac, linux) => {
    return {
      windows: {
        events: windows.events,
        malware: windows.malware,
      },
      mac: {
        events: mac.events,
        malware: mac.malware,
      },
      linux: {
        events: linux.events,
      },
    };
  }
);

/** Returns an object of all the windows eventing configuration */
export const windowsEventing = (state: PolicyDetailsState) => {
  const config = policyConfig(state);
  return config && config.windows.events;
};

/** Returns the total number of possible windows eventing configurations */
export const totalWindowsEventing = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.keys(config.windows.events).length;
  }
  return 0;
};

/** Returns the number of selected windows eventing configurations */
export const selectedWindowsEventing = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.values(config.windows.events).reduce((count, event) => {
      return event === true ? count + 1 : count;
    }, 0);
  }
  return 0;
};

/** Returns an object of all the mac eventing configurations */
export const macEventing = (state: PolicyDetailsState) => {
  const config = policyConfig(state);
  return config && config.mac.events;
};

/** Returns the total number of possible mac eventing configurations */
export const totalMacEventing = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.keys(config.mac.events).length;
  }
  return 0;
};

/** Returns the number of selected mac eventing configurations */
export const selectedMacEventing = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.values(config.mac.events).reduce((count, event) => {
      return event === true ? count + 1 : count;
    }, 0);
  }
  return 0;
};

/** is there an api call in flight */
export const isLoading = (state: PolicyDetailsState) => state.isLoading;

/** API error when fetching Policy data */
export const apiError = (state: PolicyDetailsState) => state.apiError;

/** Policy Agent Summary Stats */
export const agentStatusSummary = (state: PolicyDetailsState) => state.agentStatusSummary;

/** Status for an update to the policy */
export const updateStatus = (state: PolicyDetailsState) => state.updateStatus;

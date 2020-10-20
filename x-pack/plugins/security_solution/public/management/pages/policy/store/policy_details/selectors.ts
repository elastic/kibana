/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { matchPath } from 'react-router-dom';
import { PolicyDetailsState } from '../../types';
import {
  Immutable,
  NewPolicyData,
  PolicyConfig,
  PolicyData,
  UIPolicyConfig,
} from '../../../../../../common/endpoint/types';
import { factory as policyConfigFactory } from '../../../../../../common/endpoint/models/policy_config';
import { MANAGEMENT_ROUTING_POLICY_DETAILS_PATH } from '../../../../common/constants';
import { ManagementRoutePolicyDetailsParams } from '../../../../types';

/** Returns the policy details */
export const policyDetails = (state: Immutable<PolicyDetailsState>) => state.policyItem;

/**
 * Given a Policy Data (package policy) object, return back a new object with only the field
 * needed for an Update/Create API action
 * @param policy
 */
export const getPolicyDataForUpdate = (
  policy: PolicyData | Immutable<PolicyData>
): NewPolicyData | Immutable<NewPolicyData> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { id, revision, created_by, created_at, updated_by, updated_at, ...newPolicy } = policy;
  return newPolicy;
};

/**
 * Return only the policy structure accepted for update/create
 */
export const policyDetailsForUpdate: (
  state: Immutable<PolicyDetailsState>
) => Immutable<NewPolicyData> | undefined = createSelector(policyDetails, (policy) => {
  if (policy) {
    return getPolicyDataForUpdate(policy);
  }
});

/** Returns a boolean of whether the user is on the policy details page or not */
export const isOnPolicyDetailsPage = (state: Immutable<PolicyDetailsState>) => {
  return (
    matchPath(state.location?.pathname ?? '', {
      path: MANAGEMENT_ROUTING_POLICY_DETAILS_PATH,
      exact: true,
    }) !== null
  );
};

/** Returns the policyId from the url */
export const policyIdFromParams: (state: Immutable<PolicyDetailsState>) => string = createSelector(
  (state) => state.location,
  (location: PolicyDetailsState['location']) => {
    return (
      matchPath<ManagementRoutePolicyDetailsParams>(location?.pathname ?? '', {
        path: MANAGEMENT_ROUTING_POLICY_DETAILS_PATH,
        exact: true,
      })?.params?.policyId ?? ''
    );
  }
);

const defaultFullPolicy: Immutable<PolicyConfig> = policyConfigFactory();

/**
 * Returns the full Endpoint Policy, which will include private settings not shown on the UI.
 * Note: this will return a default full policy if the `policyItem` is `undefined`
 */
export const fullPolicy: (s: Immutable<PolicyDetailsState>) => PolicyConfig = createSelector(
  policyDetails,
  (policyData) => {
    return policyData?.inputs[0]?.config?.policy?.value ?? defaultFullPolicy;
  }
);

const fullWindowsPolicySettings: (
  s: PolicyDetailsState
) => PolicyConfig['windows'] = createSelector(fullPolicy, (policy) => policy?.windows);

const fullMacPolicySettings: (s: PolicyDetailsState) => PolicyConfig['mac'] = createSelector(
  fullPolicy,
  (policy) => policy?.mac
);

const fullLinuxPolicySettings: (s: PolicyDetailsState) => PolicyConfig['linux'] = createSelector(
  fullPolicy,
  (policy) => policy?.linux
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

/** Returns the total number of possible windows eventing configurations */
export const totalWindowsEvents = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.keys(config.windows.events).length;
  }
  return 0;
};

/** Returns the number of selected windows eventing configurations */
export const selectedWindowsEvents = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.values(config.windows.events).reduce((count, event) => {
      return event === true ? count + 1 : count;
    }, 0);
  }
  return 0;
};

/** Returns the total number of possible mac eventing configurations */
export const totalMacEvents = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.keys(config.mac.events).length;
  }
  return 0;
};

/** Returns the number of selected mac eventing configurations */
export const selectedMacEvents = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.values(config.mac.events).reduce((count, event) => {
      return event === true ? count + 1 : count;
    }, 0);
  }
  return 0;
};

/** Returns the total number of possible linux eventing configurations */
export const totalLinuxEvents = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.keys(config.linux.events).length;
  }
  return 0;
};

/** Returns the number of selected liinux eventing configurations */
export const selectedLinuxEvents = (state: PolicyDetailsState): number => {
  const config = policyConfig(state);
  if (config) {
    return Object.values(config.linux.events).reduce((count, event) => {
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

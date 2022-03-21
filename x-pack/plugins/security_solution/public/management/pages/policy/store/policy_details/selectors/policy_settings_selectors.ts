/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchPath } from 'react-router-dom';
import { createSelector } from 'reselect';
import { ILicense } from '../../../../../../../../licensing/common/types';
import { unsetPolicyFeaturesAccordingToLicenseLevel } from '../../../../../../../common/license/policy_config';
import { PolicyDetailsState } from '../../../types';
import {
  Immutable,
  NewPolicyData,
  PolicyConfig,
  PolicyData,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
import { policyFactory as policyConfigFactory } from '../../../../../../../common/endpoint/models/policy_config';
import {
  MANAGEMENT_ROUTING_POLICY_DETAILS_FORM_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_EVENT_FILTERS_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_BLOCKLISTS_PATH,
} from '../../../../../common/constants';
import { ManagementRoutePolicyDetailsParams } from '../../../../../types';
import { getPolicyDataForUpdate } from '../../../../../../../common/endpoint/service/policy';
import {
  isOnPolicyTrustedAppsView,
  isOnPolicyEventFiltersView,
  isOnHostIsolationExceptionsView,
  isOnPolicyFormView,
  isOnBlocklistsView,
} from './policy_common_selectors';

/** Returns the policy details */
export const policyDetails = (state: Immutable<PolicyDetailsState>) => state.policyItem;
/** Returns current active license */
export const licenseState = (state: Immutable<PolicyDetailsState>) => state.license;

export const licensedPolicy: (
  state: Immutable<PolicyDetailsState>
) => Immutable<PolicyData> | undefined = createSelector(
  policyDetails,
  licenseState,
  (policyData, license) => {
    if (policyData) {
      const policyValue = unsetPolicyFeaturesAccordingToLicenseLevel(
        policyData.inputs[0].config.policy.value,
        license as ILicense
      );
      const newPolicyData: Immutable<PolicyData> = {
        ...policyData,
        inputs: [
          {
            ...policyData.inputs[0],
            config: {
              ...policyData.inputs[0].config,
              policy: {
                ...policyData.inputs[0].config.policy,
                value: policyValue,
              },
            },
          },
        ],
      };
      return newPolicyData;
    }
    return policyData;
  }
);

/**
 * Return only the policy structure accepted for update/create
 */
export const policyDetailsForUpdate: (
  state: Immutable<PolicyDetailsState>
) => Immutable<NewPolicyData> | undefined = createSelector(licensedPolicy, (policy) => {
  if (policy) {
    return getPolicyDataForUpdate(policy) as Immutable<NewPolicyData>;
  }
});

/**
 * Checks if data needs to be refreshed
 */
export const needsToRefresh = (state: Immutable<PolicyDetailsState>): boolean => {
  return !state.policyItem && !state.apiError;
};

/** Returns a boolean of whether the user is on some of the policy details page or not */
export const isOnPolicyDetailsPage = (state: Immutable<PolicyDetailsState>) =>
  isOnPolicyFormView(state) ||
  isOnPolicyTrustedAppsView(state) ||
  isOnPolicyEventFiltersView(state) ||
  isOnHostIsolationExceptionsView(state) ||
  isOnBlocklistsView(state);

/** Returns the license info fetched from the license service */
export const license = (state: Immutable<PolicyDetailsState>) => {
  return state.license;
};

/** Returns the policyId from the url */
export const policyIdFromParams: (state: Immutable<PolicyDetailsState>) => string = createSelector(
  (state) => state.location,
  (location: PolicyDetailsState['location']) => {
    return (
      matchPath<ManagementRoutePolicyDetailsParams>(location?.pathname ?? '', {
        path: [
          MANAGEMENT_ROUTING_POLICY_DETAILS_FORM_PATH,
          MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH,
          MANAGEMENT_ROUTING_POLICY_DETAILS_EVENT_FILTERS_PATH,
          MANAGEMENT_ROUTING_POLICY_DETAILS_HOST_ISOLATION_EXCEPTIONS_PATH,
          MANAGEMENT_ROUTING_POLICY_DETAILS_BLOCKLISTS_PATH,
        ],
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
  licensedPolicy,
  (policyData) => {
    return policyData?.inputs[0]?.config?.policy?.value ?? defaultFullPolicy;
  }
);

const fullWindowsPolicySettings: (s: PolicyDetailsState) => PolicyConfig['windows'] =
  createSelector(fullPolicy, (policy) => policy?.windows);

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
        advanced: windows.advanced,
        events: windows.events,
        malware: windows.malware,
        ransomware: windows.ransomware,
        memory_protection: windows.memory_protection,
        behavior_protection: windows.behavior_protection,
        popup: windows.popup,
        antivirus_registration: windows.antivirus_registration,
      },
      mac: {
        advanced: mac.advanced,
        events: mac.events,
        malware: mac.malware,
        behavior_protection: mac.behavior_protection,
        memory_protection: mac.memory_protection,
        popup: mac.popup,
      },
      linux: {
        advanced: linux.advanced,
        events: linux.events,
        malware: linux.malware,
        behavior_protection: linux.behavior_protection,
        memory_protection: linux.memory_protection,
        popup: linux.popup,
      },
    };
  }
);

export const isAntivirusRegistrationEnabled = createSelector(policyConfig, (uiPolicyConfig) => {
  return uiPolicyConfig.windows.antivirus_registration.enabled;
});

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

/** Returns the number of selected linux eventing configurations */
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

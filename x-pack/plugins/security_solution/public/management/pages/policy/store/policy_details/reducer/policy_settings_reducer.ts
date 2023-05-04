/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { parse } from 'querystring';
import { fullPolicy, isOnPolicyDetailsPage, license } from '../selectors/policy_settings_selectors';
import type {
  Immutable,
  PolicyConfig,
  PolicyData,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
import type { ImmutableReducer } from '../../../../../../common/store';
import type { AppAction } from '../../../../../../common/store/actions';
import type { PolicyDetailsState } from '../../../types';
import { extractPolicyDetailsArtifactsListPageLocation } from '../../../../../common/routing';
import { initialPolicyDetailsState } from './initial_policy_details_state';

const updatePolicyConfigInPolicyData = (
  policyData: Immutable<PolicyData>,
  policyConfig: Immutable<PolicyConfig>
) => ({
  ...policyData,
  inputs: policyData.inputs.map((input) => ({
    ...input,
    config: input.config && {
      ...input.config,
      policy: {
        ...input.config.policy,
        value: policyConfig,
      },
    },
  })),
});

export const policySettingsReducer: ImmutableReducer<PolicyDetailsState, AppAction> = (
  state = initialPolicyDetailsState(),
  action
) => {
  if (
    action.type === 'serverReturnedPolicyDetailsData' ||
    action.type === 'serverReturnedUpdatedPolicyDetailsData'
  ) {
    return {
      ...state,
      ...action.payload,
      isLoading: false,
    };
  }

  if (action.type === 'serverFailedToReturnPolicyDetailsData') {
    return {
      ...state,
      isLoading: false,
      apiError: action.payload,
    };
  }

  if (action.type === 'serverReturnedPolicyDetailsAgentSummaryData') {
    return {
      ...state,
      ...action.payload,
    };
  }

  if (action.type === 'serverReturnedPolicyDetailsUpdateFailure') {
    return {
      ...state,
      isLoading: false,
      updateStatus: action.payload,
    };
  }

  if (action.type === 'userClickedPolicyDetailsSaveButton') {
    return {
      ...state,
      isLoading: true,
      updateApiError: undefined,
    };
  }

  if (action.type === 'licenseChanged') {
    return {
      ...state,
      license: action.payload,
    };
  }

  if (action.type === 'userChangedUrl') {
    const newState: Immutable<PolicyDetailsState> = {
      ...state,
      location: action.payload,
      artifacts: {
        ...state.artifacts,
        location: extractPolicyDetailsArtifactsListPageLocation(
          parse(action.payload.search.slice(1))
        ),
      },
    };
    const isCurrentlyOnDetailsPage = isOnPolicyDetailsPage(newState);
    const wasPreviouslyOnDetailsPage = isOnPolicyDetailsPage(state);
    const currentLicense = license(newState);

    if (isCurrentlyOnDetailsPage) {
      // Did user just enter the Detail page? if so, then
      // set the loading indicator and return new state
      if (!wasPreviouslyOnDetailsPage) {
        return {
          ...newState,
          isLoading: true,
        };
      }
      // Else, user was already on the details page,
      // just return the updated state with new location data
      return newState;
    }

    return {
      ...initialPolicyDetailsState(),
      location: action.payload,
      license: currentLicense,
    };
  }

  if (action.type === 'userChangedPolicyConfig') {
    if (!state.policyItem) {
      return state;
    }
    const newState = { ...state, policyItem: { ...state.policyItem } };
    const newPolicy: PolicyConfig = { ...fullPolicy(state) };

    /**
     * This is directly changing redux state because `policyItem.inputs` was copied over and not cloned.
     */
    // @ts-expect-error
    newState.policyItem.inputs[0].config.policy.value = newPolicy;

    Object.entries(action.payload.policyConfig).forEach(([section, newSettings]) => {
      /**
       * this is not safe because `action.payload.policyConfig` may have excess keys
       */
      // @ts-expect-error
      newPolicy[section as keyof UIPolicyConfig] = {
        ...newPolicy[section as keyof UIPolicyConfig],
        ...newSettings,
      };
    });

    return newState;
  }

  if (action.type === 'userChangedAntivirusRegistration') {
    if (state.policyItem) {
      const policyConfig = fullPolicy(state);

      return {
        ...state,
        policyItem: updatePolicyConfigInPolicyData(state.policyItem, {
          ...policyConfig,
          windows: {
            ...policyConfig.windows,
            antivirus_registration: {
              enabled: action.payload.enabled,
            },
          },
        }),
      };
    } else {
      return state;
    }
  }

  if (action.type === 'userChangedCredentialHardening') {
    if (state.policyItem) {
      const policyConfig = fullPolicy(state);

      return {
        ...state,
        policyItem: updatePolicyConfigInPolicyData(state.policyItem, {
          ...policyConfig,
          windows: {
            ...policyConfig.windows,
            attack_surface_reduction: {
              credential_hardening: {
                enabled: action.payload.enabled,
              },
            },
          },
        }),
      };
    } else {
      return state;
    }
  }

  return state;
};

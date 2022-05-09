/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '@kbn/licensing-plugin/common/types';
import { GetAgentStatusResponse } from '@kbn/fleet-plugin/common/types/rest_spec';
import { PolicyData, UIPolicyConfig } from '../../../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../../../common/types';
import { PolicyDetailsState } from '../../../types';

export interface ServerReturnedPolicyDetailsData {
  type: 'serverReturnedPolicyDetailsData';
  payload: {
    policyItem: PolicyData | undefined;
  };
}

export interface ServerFailedToReturnPolicyDetailsData {
  type: 'serverFailedToReturnPolicyDetailsData';
  payload: ServerApiError;
}

/**
 * When users change a policy via forms, this action is dispatched with a payload that modifies the configuration of a cloned policy config.
 */
export interface UserChangedPolicyConfig {
  type: 'userChangedPolicyConfig';
  payload: {
    policyConfig: UIPolicyConfig;
  };
}

export interface UserChangedAntivirusRegistration {
  type: 'userChangedAntivirusRegistration';
  payload: {
    enabled: boolean;
  };
}

export interface ServerReturnedPolicyDetailsAgentSummaryData {
  type: 'serverReturnedPolicyDetailsAgentSummaryData';
  payload: {
    agentStatusSummary: GetAgentStatusResponse['results'];
  };
}

export interface ServerReturnedPolicyDetailsUpdateFailure {
  type: 'serverReturnedPolicyDetailsUpdateFailure';
  payload: PolicyDetailsState['updateStatus'];
}

export interface ServerReturnedUpdatedPolicyDetailsData {
  type: 'serverReturnedUpdatedPolicyDetailsData';
  payload: {
    policyItem: PolicyData;
    updateStatus: PolicyDetailsState['updateStatus'];
  };
}

export interface UserClickedPolicyDetailsSaveButton {
  type: 'userClickedPolicyDetailsSaveButton';
}

export interface LicenseChanged {
  type: 'licenseChanged';
  payload: ILicense;
}

export type PolicySettingsAction =
  | ServerReturnedPolicyDetailsData
  | UserClickedPolicyDetailsSaveButton
  | ServerReturnedPolicyDetailsAgentSummaryData
  | ServerReturnedPolicyDetailsUpdateFailure
  | ServerReturnedUpdatedPolicyDetailsData
  | ServerFailedToReturnPolicyDetailsData
  | UserChangedPolicyConfig
  | UserChangedAntivirusRegistration
  | LicenseChanged;

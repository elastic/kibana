/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '../../../../../../../licensing/common/types';
import { GetAgentStatusResponse } from '../../../../../../../fleet/common/types/rest_spec';
import { PolicyData, UIPolicyConfig } from '../../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../../common/types';
import { PolicyDetailsState } from '../../types';

interface ServerReturnedPolicyDetailsData {
  type: 'serverReturnedPolicyDetailsData';
  payload: {
    policyItem: PolicyData | undefined;
  };
}

interface ServerFailedToReturnPolicyDetailsData {
  type: 'serverFailedToReturnPolicyDetailsData';
  payload: ServerApiError;
}

/**
 * When users change a policy via forms, this action is dispatched with a payload that modifies the configuration of a cloned policy config.
 */
interface UserChangedPolicyConfig {
  type: 'userChangedPolicyConfig';
  payload: {
    policyConfig: UIPolicyConfig;
  };
}

interface UserChangedAntivirusRegistration {
  type: 'userChangedAntivirusRegistration';
  payload: {
    enabled: boolean;
  };
}

interface ServerReturnedPolicyDetailsAgentSummaryData {
  type: 'serverReturnedPolicyDetailsAgentSummaryData';
  payload: {
    agentStatusSummary: GetAgentStatusResponse['results'];
  };
}

interface ServerReturnedPolicyDetailsUpdateFailure {
  type: 'serverReturnedPolicyDetailsUpdateFailure';
  payload: PolicyDetailsState['updateStatus'];
}

interface ServerReturnedUpdatedPolicyDetailsData {
  type: 'serverReturnedUpdatedPolicyDetailsData';
  payload: {
    policyItem: PolicyData;
    updateStatus: PolicyDetailsState['updateStatus'];
  };
}

interface UserClickedPolicyDetailsSaveButton {
  type: 'userClickedPolicyDetailsSaveButton';
}

interface LicenseChanged {
  type: 'licenseChanged';
  payload: ILicense;
}

export type PolicyDetailsAction =
  | ServerReturnedPolicyDetailsData
  | UserClickedPolicyDetailsSaveButton
  | ServerReturnedPolicyDetailsAgentSummaryData
  | ServerReturnedPolicyDetailsUpdateFailure
  | ServerReturnedUpdatedPolicyDetailsData
  | ServerFailedToReturnPolicyDetailsData
  | UserChangedPolicyConfig
  | UserChangedAntivirusRegistration
  | LicenseChanged;

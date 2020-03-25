/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyData, ServerApiError } from '../../types';
import { GetAgentStatusResponse } from '../../../../../../ingest_manager/common/types/rest_spec';

interface ServerReturnedPolicyDetailsData {
  type: 'serverReturnedPolicyDetailsData';
  payload: {
    policyItem: PolicyData | undefined;
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
  payload: ServerApiError;
}

interface UserClickedPolicyDetailsSaveButton {
  type: 'userClickedPolicyDetailsSaveButton';
}

export type PolicyDetailsAction =
  | ServerReturnedPolicyDetailsData
  | UserClickedPolicyDetailsSaveButton
  | ServerReturnedPolicyDetailsAgentSummaryData
  | ServerReturnedPolicyDetailsUpdateFailure;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyData } from '../../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../../common/types';
import {
  GetAgentStatusResponse,
  GetPackagesResponse,
} from '../../../../../../../ingest_manager/common';

interface ServerReturnedPolicyListData {
  type: 'serverReturnedPolicyListData';
  payload: {
    policyItems: PolicyData[];
    total: number;
    pageSize: number;
    pageIndex: number;
  };
}

interface ServerFailedToReturnPolicyListData {
  type: 'serverFailedToReturnPolicyListData';
  payload: ServerApiError;
}

interface UserClickedPolicyListDeleteButton {
  type: 'userClickedPolicyListDeleteButton';
  payload: { policyId: string };
}

interface UserOpenedPolicyListDeleteModal {
  type: 'userOpenedPolicyListDeleteModal';
  payload: { agentConfigId: string };
}

interface ServerDeletedPolicyFailure {
  type: 'serverDeletedPolicyFailure';
  payload: ServerApiError;
}

interface ServerDeletedPolicy {
  type: 'serverDeletedPolicy';
  payload: { id: string; success: boolean };
}

interface ServerReturnedPolicyAgentsSummaryForDeleteFailure {
  type: 'serverReturnedPolicyAgentsSummaryForDeleteFailure';
  payload: ServerApiError;
}

interface ServerReturnedPolicyAgentsSummaryForDelete {
  type: 'serverReturnedPolicyAgentsSummaryForDelete';
  payload: { agentStatusSummary: GetAgentStatusResponse['results'] };
}

interface ServerReturnedEndpointPackageInfo {
  type: 'serverReturnedEndpointPackageInfo';
  payload: GetPackagesResponse['response'][0];
}

export type PolicyListAction =
  | ServerReturnedPolicyListData
  | ServerFailedToReturnPolicyListData
  | UserClickedPolicyListDeleteButton
  | ServerDeletedPolicyFailure
  | ServerDeletedPolicy
  | UserOpenedPolicyListDeleteModal
  | ServerReturnedPolicyAgentsSummaryForDeleteFailure
  | ServerReturnedPolicyAgentsSummaryForDelete
  | ServerReturnedEndpointPackageInfo;

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

export interface ServerReturnedPolicyListData {
  type: 'serverReturnedPolicyListData';
  payload: {
    policyItems: PolicyData[];
    total: number;
    pageSize: number;
    pageIndex: number;
  };
}

export interface ServerFailedToReturnPolicyListData {
  type: 'serverFailedToReturnPolicyListData';
  payload: ServerApiError;
}

export interface UserClickedPolicyListDeleteButton {
  type: 'userClickedPolicyListDeleteButton';
  payload: { policyId: string };
}

export interface UserOpenedPolicyListDeleteModal {
  type: 'userOpenedPolicyListDeleteModal';
  payload: { agentConfigId: string };
}

export interface ServerDeletedPolicyFailure {
  type: 'serverDeletedPolicyFailure';
  payload: ServerApiError;
}

export interface ServerDeletedPolicy {
  type: 'serverDeletedPolicy';
  payload: { id: string; success: boolean };
}

export interface ServerReturnedPolicyAgentsSummaryForDeleteFailure {
  type: 'serverReturnedPolicyAgentsSummaryForDeleteFailure';
  payload: ServerApiError;
}

export interface ServerReturnedPolicyAgentsSummaryForDelete {
  type: 'serverReturnedPolicyAgentsSummaryForDelete';
  payload: { agentStatusSummary: GetAgentStatusResponse['results'] };
}

export interface ServerReturnedEndpointPackageInfo {
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

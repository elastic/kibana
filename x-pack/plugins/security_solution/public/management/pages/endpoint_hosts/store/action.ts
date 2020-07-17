/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HostResultList,
  HostInfo,
  GetHostPolicyResponse,
} from '../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../common/types';
import { GetPolicyListResponse } from '../../policy/types';
import { GetPackagesResponse } from '../../../../../../ingest_manager/common';

export interface ServerReturnedHostList {
  type: 'serverReturnedHostList';
  payload: HostResultList;
}

export interface ServerFailedToReturnHostList {
  type: 'serverFailedToReturnHostList';
  payload: ServerApiError;
}

export interface ServerReturnedHostDetails {
  type: 'serverReturnedHostDetails';
  payload: HostInfo;
}

export interface ServerFailedToReturnHostDetails {
  type: 'serverFailedToReturnHostDetails';
  payload: ServerApiError;
}

export interface ServerReturnedHostPolicyResponse {
  type: 'serverReturnedHostPolicyResponse';
  payload: GetHostPolicyResponse;
}

export interface ServerFailedToReturnHostPolicyResponse {
  type: 'serverFailedToReturnHostPolicyResponse';
  payload: ServerApiError;
}

export interface ServerReturnedPoliciesForOnboarding {
  type: 'serverReturnedPoliciesForOnboarding';
  payload: {
    policyItems: GetPolicyListResponse['items'];
  };
}

export interface ServerFailedToReturnPoliciesForOnboarding {
  type: 'serverFailedToReturnPoliciesForOnboarding';
  payload: ServerApiError;
}

export interface UserSelectedEndpointPolicy {
  type: 'userSelectedEndpointPolicy';
  payload: {
    selectedPolicyId: string;
  };
}

export interface ServerCancelledHostListLoading {
  type: 'serverCancelledHostListLoading';
}

export interface ServerCancelledPolicyItemsLoading {
  type: 'serverCancelledPolicyItemsLoading';
}

export interface ServerReturnedEndpointPackageInfo {
  type: 'serverReturnedEndpointPackageInfo';
  payload: GetPackagesResponse['response'][0];
}

export type HostAction =
  | ServerReturnedHostList
  | ServerFailedToReturnHostList
  | ServerReturnedHostDetails
  | ServerFailedToReturnHostDetails
  | ServerReturnedHostPolicyResponse
  | ServerFailedToReturnHostPolicyResponse
  | ServerReturnedPoliciesForOnboarding
  | ServerFailedToReturnPoliciesForOnboarding
  | UserSelectedEndpointPolicy
  | ServerCancelledHostListLoading
  | ServerCancelledPolicyItemsLoading
  | ServerReturnedEndpointPackageInfo;

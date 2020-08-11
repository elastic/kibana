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
import { HostState } from '../types';

interface ServerReturnedHostList {
  type: 'serverReturnedHostList';
  payload: HostResultList;
}

interface ServerFailedToReturnHostList {
  type: 'serverFailedToReturnHostList';
  payload: ServerApiError;
}

interface ServerReturnedHostDetails {
  type: 'serverReturnedHostDetails';
  payload: HostInfo;
}

interface ServerFailedToReturnHostDetails {
  type: 'serverFailedToReturnHostDetails';
  payload: ServerApiError;
}

interface ServerReturnedHostPolicyResponse {
  type: 'serverReturnedHostPolicyResponse';
  payload: GetHostPolicyResponse;
}

interface ServerFailedToReturnHostPolicyResponse {
  type: 'serverFailedToReturnHostPolicyResponse';
  payload: ServerApiError;
}

interface ServerReturnedPoliciesForOnboarding {
  type: 'serverReturnedPoliciesForOnboarding';
  payload: {
    policyItems: GetPolicyListResponse['items'];
  };
}

interface ServerFailedToReturnPoliciesForOnboarding {
  type: 'serverFailedToReturnPoliciesForOnboarding';
  payload: ServerApiError;
}

interface UserSelectedEndpointPolicy {
  type: 'userSelectedEndpointPolicy';
  payload: {
    selectedPolicyId: string;
  };
}

interface ServerCancelledHostListLoading {
  type: 'serverCancelledHostListLoading';
}

interface ServerCancelledPolicyItemsLoading {
  type: 'serverCancelledPolicyItemsLoading';
}

interface ServerReturnedEndpointPackageInfo {
  type: 'serverReturnedEndpointPackageInfo';
  payload: GetPackagesResponse['response'][0];
}

interface ServerReturnedHostNonExistingPolicies {
  type: 'serverReturnedHostNonExistingPolicies';
  payload: HostState['nonExistingPolicies'];
}

interface ServerReturnedHostExistValue {
  type: 'serverReturnedHostExistValue';
  payload: boolean;
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
  | ServerReturnedHostExistValue
  | ServerCancelledPolicyItemsLoading
  | ServerReturnedEndpointPackageInfo
  | ServerReturnedHostNonExistingPolicies;

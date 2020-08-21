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
import { EndpointState } from '../types';

interface ServerReturnedEndpointList {
  type: 'serverReturnedEndpointList';
  payload: HostResultList;
}

interface ServerFailedToReturnEndpointList {
  type: 'serverFailedToReturnEndpointList';
  payload: ServerApiError;
}

interface ServerReturnedEndpointDetails {
  type: 'serverReturnedEndpointDetails';
  payload: HostInfo;
}

interface ServerFailedToReturnEndpointDetails {
  type: 'serverFailedToReturnEndpointDetails';
  payload: ServerApiError;
}

interface ServerReturnedEndpointPolicyResponse {
  type: 'serverReturnedEndpointPolicyResponse';
  payload: GetHostPolicyResponse;
}

interface ServerFailedToReturnEndpointPolicyResponse {
  type: 'serverFailedToReturnEndpointPolicyResponse';
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

interface ServerCancelledEndpointListLoading {
  type: 'serverCancelledEndpointListLoading';
}

interface ServerCancelledPolicyItemsLoading {
  type: 'serverCancelledPolicyItemsLoading';
}

interface ServerReturnedEndpointPackageInfo {
  type: 'serverReturnedEndpointPackageInfo';
  payload: GetPackagesResponse['response'][0];
}

interface ServerReturnedEndpointNonExistingPolicies {
  type: 'serverReturnedEndpointNonExistingPolicies';
  payload: EndpointState['nonExistingPolicies'];
}

interface ServerReturnedEndpointExistValue {
  type: 'serverReturnedEndpointExistValue';
  payload: boolean;
}

interface UserUpdatedEndpointListRefreshOptions {
  type: 'userUpdatedEndpointListRefreshOptions';
  payload: {
    isAutoRefreshEnabled?: boolean;
    autoRefreshInterval?: number;
  };
}

interface AppRequestedEndpointList {
  type: 'appRequestedEndpointList';
}

export type EndpointAction =
  | ServerReturnedEndpointList
  | ServerFailedToReturnEndpointList
  | ServerReturnedEndpointDetails
  | ServerFailedToReturnEndpointDetails
  | ServerReturnedEndpointPolicyResponse
  | ServerFailedToReturnEndpointPolicyResponse
  | ServerReturnedPoliciesForOnboarding
  | ServerFailedToReturnPoliciesForOnboarding
  | UserSelectedEndpointPolicy
  | ServerCancelledEndpointListLoading
  | ServerReturnedEndpointExistValue
  | ServerCancelledPolicyItemsLoading
  | ServerReturnedEndpointPackageInfo
  | AppRequestedEndpointList
  | ServerReturnedEndpointNonExistingPolicies
  | UserUpdatedEndpointListRefreshOptions;

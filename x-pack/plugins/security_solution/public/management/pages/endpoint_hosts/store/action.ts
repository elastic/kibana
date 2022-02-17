/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux';
import { EuiSuperDatePickerRecentRange } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import {
  HostInfo,
  GetHostPolicyResponse,
  HostIsolationRequestBody,
  ISOLATION_ACTIONS,
  MetadataListResponse,
} from '../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../common/types';
import { GetPolicyListResponse } from '../../policy/types';
import { EndpointState } from '../types';

export interface ServerReturnedEndpointList {
  type: 'serverReturnedEndpointList';
  payload: MetadataListResponse;
}

export interface ServerFailedToReturnEndpointList {
  type: 'serverFailedToReturnEndpointList';
  payload: ServerApiError;
}

export interface ServerReturnedEndpointDetails {
  type: 'serverReturnedEndpointDetails';
  payload: HostInfo;
}

export interface ServerFailedToReturnEndpointDetails {
  type: 'serverFailedToReturnEndpointDetails';
  payload: ServerApiError;
}
export interface ServerReturnedEndpointPolicyResponse {
  type: 'serverReturnedEndpointPolicyResponse';
  payload: GetHostPolicyResponse;
}

export interface ServerFailedToReturnEndpointPolicyResponse {
  type: 'serverFailedToReturnEndpointPolicyResponse';
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

export interface ServerCancelledEndpointListLoading {
  type: 'serverCancelledEndpointListLoading';
}

export interface ServerCancelledPolicyItemsLoading {
  type: 'serverCancelledPolicyItemsLoading';
}

export type EndpointPackageInfoStateChanged = Action<'endpointPackageInfoStateChanged'> & {
  payload: EndpointState['endpointPackageInfo'];
};

export interface ServerReturnedEndpointNonExistingPolicies {
  type: 'serverReturnedEndpointNonExistingPolicies';
  payload: EndpointState['nonExistingPolicies'];
}

export interface ServerReturnedEndpointAgentPolicies {
  type: 'serverReturnedEndpointAgentPolicies';
  payload: EndpointState['agentPolicies'];
}

export interface ServerReturnedEndpointExistValue {
  type: 'serverReturnedEndpointExistValue';
  payload: boolean;
}

export interface ServerReturnedMetadataPatterns {
  type: 'serverReturnedMetadataPatterns';
  payload: DataViewBase[];
}

export interface ServerFailedToReturnMetadataPatterns {
  type: 'serverFailedToReturnMetadataPatterns';
  payload: ServerApiError;
}

export interface UserUpdatedEndpointListRefreshOptions {
  type: 'userUpdatedEndpointListRefreshOptions';
  payload: {
    isAutoRefreshEnabled?: boolean;
    autoRefreshInterval?: number;
  };
}

export interface AppRequestedEndpointList {
  type: 'appRequestedEndpointList';
}

export interface ServerReturnedAgenstWithEndpointsTotal {
  type: 'serverReturnedAgenstWithEndpointsTotal';
  payload: number;
}

export interface ServerFailedToReturnAgenstWithEndpointsTotal {
  type: 'serverFailedToReturnAgenstWithEndpointsTotal';
  payload: ServerApiError;
}

export interface ServerReturnedEndpointsTotal {
  type: 'serverReturnedEndpointsTotal';
  payload: number;
}

export interface ServerFailedToReturnEndpointsTotal {
  type: 'serverFailedToReturnEndpointsTotal';
  payload: ServerApiError;
}

export type EndpointIsolationRequest = Action<'endpointIsolationRequest'> & {
  payload: {
    type: ISOLATION_ACTIONS;
    data: HostIsolationRequestBody;
  };
};

export type EndpointIsolationRequestStateChange = Action<'endpointIsolationRequestStateChange'> & {
  payload: EndpointState['isolationRequestState'];
};

export type EndpointDetailsActivityLogChanged = Action<'endpointDetailsActivityLogChanged'> & {
  payload: EndpointState['endpointDetails']['activityLog']['logData'];
};

export type EndpointPendingActionsStateChanged = Action<'endpointPendingActionsStateChanged'> & {
  payload: EndpointState['endpointPendingActions'];
};

export interface EndpointDetailsActivityLogUpdatePaging {
  type: 'endpointDetailsActivityLogUpdatePaging';
  payload: {
    // disable paging when no more data after paging
    disabled?: boolean;
    page: number;
    pageSize: number;
    startDate: string;
    endDate: string;
  };
}

export interface UserUpdatedActivityLogRefreshOptions {
  type: 'userUpdatedActivityLogRefreshOptions';
  payload: {
    autoRefreshOptions: { enabled: boolean; duration: number };
  };
}

export interface UserUpdatedActivityLogRecentlyUsedDateRanges {
  type: 'userUpdatedActivityLogRecentlyUsedDateRanges';
  payload: EuiSuperDatePickerRecentRange[];
}

export interface EndpointDetailsLoad {
  type: 'endpointDetailsLoad';
  payload: {
    endpointId: string;
  };
}

export interface EndpointDetailsActivityLogUpdateIsInvalidDateRange {
  type: 'endpointDetailsActivityLogUpdateIsInvalidDateRange';
  payload: {
    isInvalidDateRange?: boolean;
  };
}

export type LoadMetadataTransformStats = Action<'loadMetadataTransformStats'>;

export type MetadataTransformStatsChanged = Action<'metadataTransformStatsChanged'> & {
  payload: EndpointState['metadataTransformStats'];
};

export type EndpointAction =
  | ServerReturnedEndpointList
  | ServerFailedToReturnEndpointList
  | ServerReturnedEndpointDetails
  | ServerFailedToReturnEndpointDetails
  | EndpointDetailsActivityLogUpdatePaging
  | EndpointDetailsActivityLogUpdateIsInvalidDateRange
  | EndpointDetailsActivityLogChanged
  | UserUpdatedActivityLogRefreshOptions
  | UserUpdatedActivityLogRecentlyUsedDateRanges
  | EndpointDetailsLoad
  | ServerReturnedEndpointPolicyResponse
  | ServerFailedToReturnEndpointPolicyResponse
  | ServerReturnedPoliciesForOnboarding
  | ServerFailedToReturnPoliciesForOnboarding
  | UserSelectedEndpointPolicy
  | ServerCancelledEndpointListLoading
  | ServerReturnedEndpointExistValue
  | ServerCancelledPolicyItemsLoading
  | EndpointPackageInfoStateChanged
  | ServerReturnedMetadataPatterns
  | ServerFailedToReturnMetadataPatterns
  | AppRequestedEndpointList
  | ServerReturnedEndpointNonExistingPolicies
  | ServerReturnedAgenstWithEndpointsTotal
  | ServerReturnedEndpointAgentPolicies
  | UserUpdatedEndpointListRefreshOptions
  | ServerReturnedEndpointsTotal
  | ServerFailedToReturnAgenstWithEndpointsTotal
  | ServerFailedToReturnEndpointsTotal
  | EndpointIsolationRequest
  | EndpointIsolationRequestStateChange
  | EndpointPendingActionsStateChanged
  | LoadMetadataTransformStats
  | MetadataTransformStatsChanged;

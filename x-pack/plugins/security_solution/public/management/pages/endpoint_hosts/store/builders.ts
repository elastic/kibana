/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_DEFAULT_SORT_DIRECTION,
  ENDPOINT_DEFAULT_SORT_FIELD,
} from '../../../../../common/endpoint/constants';
import type { Immutable } from '../../../../../common/endpoint/types';
import { DEFAULT_POLL_INTERVAL } from '../../../common/constants';
import { createLoadedResourceState, createUninitialisedResourceState } from '../../../state';
import type { EndpointState } from '../types';

export const initialEndpointPageState = (): Immutable<EndpointState> => {
  return {
    hosts: [],
    pageSize: 10,
    pageIndex: 0,
    total: 0,
    sortDirection: ENDPOINT_DEFAULT_SORT_DIRECTION,
    sortField: ENDPOINT_DEFAULT_SORT_FIELD,
    loading: false,
    error: undefined,
    location: undefined,
    policyItems: [],
    selectedPolicyId: undefined,
    policyItemsLoading: false,
    endpointPackageInfo: createUninitialisedResourceState(),
    nonExistingPolicies: {},
    agentPolicies: {},
    endpointsExist: true,
    patterns: [],
    patternsError: undefined,
    isAutoRefreshEnabled: true,
    autoRefreshInterval: DEFAULT_POLL_INTERVAL,
    agentsWithEndpointsTotal: 0,
    agentsWithEndpointsTotalError: undefined,
    endpointsTotal: 0,
    endpointsTotalError: undefined,
    isolationRequestState: createUninitialisedResourceState(),
    endpointPendingActions: createLoadedResourceState(new Map()),
    metadataTransformStats: createUninitialisedResourceState(),
    isInitialized: false,
  };
};

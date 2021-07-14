/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Immutable } from '../../../../../common/endpoint/types';
import { DEFAULT_POLL_INTERVAL } from '../../../common/constants';
import { createLoadedResourceState, createUninitialisedResourceState } from '../../../state';
import { EndpointState } from '../types';

export const initialEndpointPageState = (): Immutable<EndpointState> => {
  return {
    hosts: [],
    pageSize: 10,
    pageIndex: 0,
    total: 0,
    loading: false,
    error: undefined,
    endpointDetails: {
      flyoutView: undefined,
      activityLog: {
        paging: {
          disabled: false,
          page: 1,
          pageSize: 50,
          startDate: undefined,
          endDate: undefined,
          isInvalidDateRange: false,
        },
        logData: createUninitialisedResourceState(),
      },
      hostDetails: {
        details: undefined,
        detailsLoading: false,
        detailsError: undefined,
      },
    },
    policyResponse: undefined,
    policyResponseLoading: false,
    policyResponseError: undefined,
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
    policyVersionInfo: undefined,
    hostStatus: undefined,
    isolationRequestState: createUninitialisedResourceState(),
    endpointPendingActions: createLoadedResourceState(new Map()),
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointDetailsActivityLogChanged, EndpointPendingActionsStateChanged } from './action';
import {
  isOnEndpointPage,
  hasSelectedEndpoint,
  uiQueryParams,
  getCurrentIsolationRequestState,
} from './selectors';
import { EndpointState } from '../types';
import { initialEndpointPageState } from './builders';
import { AppAction } from '../../../../common/store/actions';
import { ImmutableReducer } from '../../../../common/store';
import { Immutable } from '../../../../../common/endpoint/types';
import { createUninitialisedResourceState, isUninitialisedResourceState } from '../../../state';

type StateReducer = ImmutableReducer<EndpointState, AppAction>;
type CaseReducer<T extends AppAction> = (
  state: Immutable<EndpointState>,
  action: Immutable<T>
) => Immutable<EndpointState>;

const handleEndpointDetailsActivityLogChanged: CaseReducer<EndpointDetailsActivityLogChanged> = (
  state,
  action
) => {
  return {
    ...state!,
    endpointDetails: {
      ...state.endpointDetails!,
      activityLog: {
        ...state.endpointDetails.activityLog,
        logData: action.payload,
      },
    },
  };
};

const handleEndpointPendingActionsStateChanged: CaseReducer<EndpointPendingActionsStateChanged> = (
  state,
  action
) => {
  if (isOnEndpointPage(state)) {
    return {
      ...state,
      endpointPendingActions: action.payload,
    };
  }
  return state;
};

/* eslint-disable-next-line complexity */
export const endpointListReducer: StateReducer = (state = initialEndpointPageState(), action) => {
  if (action.type === 'serverReturnedEndpointList') {
    const {
      hosts,
      total,
      request_page_size: pageSize,
      request_page_index: pageIndex,
      query_strategy_version: queryStrategyVersion,
      policy_info: policyVersionInfo,
    } = action.payload;
    return {
      ...state,
      hosts,
      total,
      pageSize,
      pageIndex,
      queryStrategyVersion,
      policyVersionInfo,
      loading: false,
      error: undefined,
    };
  } else if (action.type === 'serverFailedToReturnEndpointList') {
    return {
      ...state,
      error: action.payload,
      loading: false,
    };
  } else if (action.type === 'serverReturnedEndpointNonExistingPolicies') {
    return {
      ...state,
      nonExistingPolicies: {
        ...state.nonExistingPolicies,
        ...action.payload,
      },
    };
  } else if (action.type === 'serverReturnedEndpointAgentPolicies') {
    return {
      ...state,
      agentPolicies: {
        ...state.agentPolicies,
        ...action.payload,
      },
    };
  } else if (action.type === 'serverReturnedMetadataPatterns') {
    // handle error case
    return {
      ...state,
      patterns: action.payload,
      patternsError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnMetadataPatterns') {
    return {
      ...state,
      patternsError: action.payload,
    };
  } else if (action.type === 'serverReturnedEndpointDetails') {
    return {
      ...state,
      endpointDetails: {
        ...state.endpointDetails,
        hostDetails: {
          ...state.endpointDetails.hostDetails,
          details: action.payload.metadata,
          detailsLoading: false,
          detailsError: undefined,
        },
      },
      policyVersionInfo: action.payload.policy_info,
      hostStatus: action.payload.host_status,
    };
  } else if (action.type === 'serverFailedToReturnEndpointDetails') {
    return {
      ...state,
      endpointDetails: {
        ...state.endpointDetails,
        hostDetails: {
          ...state.endpointDetails.hostDetails,
          detailsError: action.payload,
          detailsLoading: false,
        },
      },
    };
  } else if (action.type === 'appRequestedEndpointActivityLog') {
    const pageData = {
      page: action.payload.page,
      pageSize: action.payload.pageSize,
    };
    return {
      ...state,
      endpointDetails: {
        ...state.endpointDetails!,
        activityLog: {
          ...state.endpointDetails.activityLog,
          ...pageData,
        },
      },
    };
  } else if (action.type === 'endpointDetailsActivityLogChanged') {
    return handleEndpointDetailsActivityLogChanged(state, action);
  } else if (action.type === 'endpointPendingActionsStateChanged') {
    return handleEndpointPendingActionsStateChanged(state, action);
  } else if (action.type === 'serverReturnedPoliciesForOnboarding') {
    return {
      ...state,
      policyItems: action.payload.policyItems,
      policyItemsLoading: false,
    };
  } else if (action.type === 'serverFailedToReturnPoliciesForOnboarding') {
    return {
      ...state,
      error: action.payload,
      policyItemsLoading: false,
    };
  } else if (action.type === 'serverReturnedEndpointPolicyResponse') {
    return {
      ...state,
      policyResponse: action.payload.policy_response,
      policyResponseLoading: false,
      policyResponseError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnEndpointPolicyResponse') {
    return {
      ...state,
      policyResponseError: action.payload,
      policyResponseLoading: false,
    };
  } else if (action.type === 'userSelectedEndpointPolicy') {
    return {
      ...state,
      selectedPolicyId: action.payload.selectedPolicyId,
      policyResponseLoading: false,
    };
  } else if (action.type === 'serverCancelledEndpointListLoading') {
    return {
      ...state,
      loading: false,
    };
  } else if (action.type === 'serverCancelledPolicyItemsLoading') {
    return {
      ...state,
      policyItemsLoading: false,
    };
  } else if (action.type === 'serverReturnedEndpointPackageInfo') {
    return {
      ...state,
      endpointPackageInfo: action.payload,
    };
  } else if (action.type === 'serverReturnedEndpointExistValue') {
    return {
      ...state,
      endpointsExist: action.payload,
    };
  } else if (action.type === 'serverReturnedAgenstWithEndpointsTotal') {
    return {
      ...state,
      agentsWithEndpointsTotal: action.payload,
      agentsWithEndpointsTotalError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnAgenstWithEndpointsTotal') {
    return {
      ...state,
      agentsWithEndpointsTotalError: action.payload,
    };
  } else if (action.type === 'serverReturnedEndpointsTotal') {
    return {
      ...state,
      endpointsTotal: action.payload,
      endpointsTotalError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnEndpointsTotal') {
    return {
      ...state,
      endpointsTotalError: action.payload,
    };
  } else if (action.type === 'userUpdatedEndpointListRefreshOptions') {
    return {
      ...state,
      isAutoRefreshEnabled: action.payload.isAutoRefreshEnabled ?? state.isAutoRefreshEnabled,
      autoRefreshInterval: action.payload.autoRefreshInterval ?? state.autoRefreshInterval,
    };
  } else if (action.type === 'endpointIsolationRequestStateChange') {
    return handleEndpointIsolationRequestStateChanged(state, action);
  } else if (action.type === 'userChangedUrl') {
    const newState: Immutable<EndpointState> = {
      ...state,
      location: action.payload,
    };
    const isCurrentlyOnListPage = isOnEndpointPage(newState) && !hasSelectedEndpoint(newState);
    const wasPreviouslyOnListPage = isOnEndpointPage(state) && !hasSelectedEndpoint(state);
    const isCurrentlyOnDetailsPage = isOnEndpointPage(newState) && hasSelectedEndpoint(newState);
    const wasPreviouslyOnDetailsPage = isOnEndpointPage(state) && hasSelectedEndpoint(state);

    const stateUpdates: Partial<EndpointState> = {
      location: action.payload,
      error: undefined,
      policyResponseError: undefined,
    };

    const activityLog = {
      logData: createUninitialisedResourceState(),
      page: 1,
      pageSize: 50,
    };

    // Reset `isolationRequestState` if needed
    if (
      uiQueryParams(newState).show !== 'isolate' &&
      !isUninitialisedResourceState(getCurrentIsolationRequestState(newState))
    ) {
      stateUpdates.isolationRequestState = createUninitialisedResourceState();
    }

    // if on the endpoint list page for the first time, return new location and load list
    if (isCurrentlyOnListPage) {
      if (!wasPreviouslyOnListPage) {
        return {
          ...state,
          ...stateUpdates,
          endpointDetails: {
            ...state.endpointDetails,
            activityLog,
            hostDetails: {
              ...state.endpointDetails.hostDetails,
              detailsError: undefined,
            },
          },
          loading: true,
          policyItemsLoading: true,
        };
      }
    } else if (isCurrentlyOnDetailsPage) {
      // if previous page was the list or another endpoint details page, load endpoint details only
      if (wasPreviouslyOnDetailsPage || wasPreviouslyOnListPage) {
        return {
          ...state,
          ...stateUpdates,
          endpointDetails: {
            ...state.endpointDetails,
            activityLog,
            hostDetails: {
              ...state.endpointDetails.hostDetails,
              detailsLoading: true,
              detailsError: undefined,
            },
          },
          detailsLoading: true,
          policyResponseLoading: true,
        };
      } else {
        // if previous page was not endpoint list or endpoint details, load both list and details
        return {
          ...state,
          ...stateUpdates,
          endpointDetails: {
            ...state.endpointDetails,
            activityLog,
            hostDetails: {
              ...state.endpointDetails.hostDetails,
              detailsLoading: true,
              detailsError: undefined,
            },
          },
          loading: true,
          policyResponseLoading: true,
          policyItemsLoading: true,
        };
      }
    }
    // otherwise we are not on a endpoint list or details page
    return {
      ...state,
      ...stateUpdates,
      endpointDetails: {
        ...state.endpointDetails,
        activityLog,
        hostDetails: {
          ...state.endpointDetails.hostDetails,
          detailsError: undefined,
        },
      },
      endpointsExist: true,
    };
  }

  return state;
};

const handleEndpointIsolationRequestStateChanged: ImmutableReducer<
  EndpointState,
  AppAction & { type: 'endpointIsolationRequestStateChange' }
> = (state, action) => {
  return {
    ...state!,
    isolationRequestState: action.payload,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  hideEditMonitorFlyout,
  postMonitorConfig,
  showEditMonitorFlyout,
  getImAgentPolicies,
  getImAgentPoliciesSuccess,
  getImAgentPoliciesFail,
  getImAgentPolicyDetail,
  getImAgentPolicyDetailSuccess,
  getImAgentPolicyDetailFail,
  postMonitorConfigSuccess,
  postMonitorConfigFail,
} from '../actions/central_management';
import { AgentPolicyPage } from '../actions/central_management';
import { AgentPolicy } from '../../../../ingest_manager/common';

export interface CentralManagementState {
  agentPolicyPage: AgentPolicyPage;
  agentPolicyError?: Error;
  agentPolicyDetail?: AgentPolicy;
  agentPolicyDetailError?: Error;
  isEditFlyoutVisible: boolean;
  loadingAgentPolicies: boolean;
  loadingAgentPolicyDetail: boolean;
  savingConfiguration: boolean;
  saveConfigurationError?: Error;
}

const initialState: CentralManagementState = {
  agentPolicyPage: {
    items: [],
  },
  isEditFlyoutVisible: false,
  loadingAgentPolicies: false,
  loadingAgentPolicyDetail: false,
  savingConfiguration: false,
};

export const centralManagementReducer = handleActions<CentralManagementState, any>(
  {
    [String(postMonitorConfig)]: (state) => ({
      ...state,
      savingConfiguration: true,
    }),
    [String(postMonitorConfigSuccess)]: (state) => ({
      ...state,
      savingConfiguration: false,
      saveConfigurationError: undefined,
    }),
    [String(postMonitorConfigFail)]: (state, action) => ({
      ...state,
      savingConfiguration: false,
      saveConfigurationError: action.payload,
    }),
    [String(showEditMonitorFlyout)]: (state) => ({
      ...state,
      isEditFlyoutVisible: true,
    }),
    [String(hideEditMonitorFlyout)]: (state) => ({
      ...state,
      isEditFlyoutVisible: false,
    }),
    [String(getImAgentPolicies)]: (state) => ({
      ...state,
      loadingAgentPolicies: true,
    }),
    [String(getImAgentPoliciesSuccess)]: (state, action) => ({
      ...state,
      loadingAgentPolicies: false,
      agentPolicyPage: action.payload,
    }),
    [String(getImAgentPoliciesFail)]: (state, action) => ({
      ...state,
      loadingAgentPolicies: false,
      agentPolicyError: action.payload,
    }),
    [String(getImAgentPolicyDetail)]: (state) => ({
      ...state,
      loadingAgentPolicyDetail: false,
    }),
    [String(getImAgentPolicyDetailSuccess)]: (state, action) => ({
      ...state,
      agentPolicyDetail: action.payload.item,
    }),
    [String(getImAgentPolicyDetailFail)]: (state, action) => ({
      ...state,
      agentPolicyDetailError: action.payload,
    }),
  },
  initialState
);

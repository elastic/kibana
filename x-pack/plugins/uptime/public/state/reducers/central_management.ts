/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  hideEditMonitorFlyout,
  postMonitorConfig,
  createManagedMonitor,
  getImAgentPolicies,
  getImAgentPoliciesSuccess,
  getImAgentPoliciesFail,
  getImAgentPolicyDetail,
  getImAgentPolicyDetailSuccess,
  getImAgentPolicyDetailFail,
  postMonitorConfigSuccess,
  postMonitorConfigFail,
  editManagedMonitor,
  putMonitorCmData,
  monitorCmDataNotFound,
} from '../actions/central_management';
import { AgentPolicyPage } from '../actions/central_management';
import { AgentPolicy } from '../../../../ingest_manager/common';
import { MonitorSummary } from '../../../common/runtime_types';

export interface CentralManagementState {
  agentPolicyPage: AgentPolicyPage;
  agentPolicyError?: Error;
  agentPolicyDetail?: AgentPolicy;
  agentPolicyDetailError?: Error;
  isEditFlyoutVisible: boolean;
  loadingAgentPolicies: boolean;
  loadingAgentPolicyDetail: boolean;
  managedIdList: string[];
  monitorToEdit?: MonitorSummary;
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
  managedIdList: [],
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
      isEditFlyoutVisible: false,
      savingConfiguration: false,
      saveConfigurationError: undefined,
    }),
    [String(postMonitorConfigFail)]: (state, action) => ({
      ...state,
      savingConfiguration: false,
      saveConfigurationError: action.payload,
    }),
    [String(createManagedMonitor)]: (state) => ({
      ...state,
      isEditFlyoutVisible: true,
      monitorToEdit: undefined,
    }),
    [String(editManagedMonitor)]: (state, action) => ({
      ...state,
      isEditFlyoutVisible: true,
      monitorToEdit: action.payload,
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
    [String(putMonitorCmData)]: (state, action) => ({
      ...state,
      managedIdList: [...state.managedIdList, action.payload],
    }),
    [String(monitorCmDataNotFound)]: (state, action) => ({
      ...state,
      managedIdList: state.managedIdList.filter((id) => id !== action.payload),
    }),
  },
  initialState
);

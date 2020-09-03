/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { apiService } from './utils';

const IM_API_PATH = '/api/ingest_manager';
const AGENT_POLICIES_PATH = '/agent_policies';
const PACKAGE_POLICIES_PATH = '/package_policies';
const DELETE_PACKAGE_POLICY_PATH = '/package_policies/delete';

const agentPolicies = (policyId: string) => `/agent_policies/${policyId}`;

export const performCentralManagementOperations = async () => {
  return await apiService.get(IM_API_PATH + AGENT_POLICIES_PATH);
};

export const fetchAgentPolicies = async () => {
  return await apiService.get(IM_API_PATH + AGENT_POLICIES_PATH);
};

export const fetchAgentPolicyDetail = async (policyId: string) => {
  return await apiService.get(IM_API_PATH + agentPolicies(policyId));
};

export const postMonitorConfig = async (payload: any) => {
  return await apiService.post(IM_API_PATH + PACKAGE_POLICIES_PATH, payload);
};

export const getMonitorCmDetails = async (monitorId: string) => {
  return await apiService.get(IM_API_PATH + PACKAGE_POLICIES_PATH + `/${monitorId}`);
};

interface DeleteMonitorPayload {
  packagePolicyIds: string[];
}

export const deleteMonitor = async (payload: DeleteMonitorPayload) => {
  return await apiService.post(IM_API_PATH + DELETE_PACKAGE_POLICY_PATH, payload);
};

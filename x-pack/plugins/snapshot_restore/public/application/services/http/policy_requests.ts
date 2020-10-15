/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { SlmPolicy, SlmPolicyPayload, PolicyIndicesResponse } from '../../../../common/types';
import {
  UIM_POLICY_EXECUTE,
  UIM_POLICY_DELETE,
  UIM_POLICY_DELETE_MANY,
  UIM_POLICY_CREATE,
  UIM_POLICY_UPDATE,
  UIM_RETENTION_SETTINGS_UPDATE,
  UIM_RETENTION_EXECUTE,
} from '../../constants';
import { UiMetricService } from '../ui_metric';
import { useRequest, sendRequest } from './use_request';

// Temporary hack to provide the uiMetricService instance to this file.
// TODO: Refactor and export an ApiService instance through the app dependencies context
let uiMetricService: UiMetricService;
export const setUiMetricServicePolicy = (_uiMetricService: UiMetricService) => {
  uiMetricService = _uiMetricService;
};
// End hack

export const useLoadPolicies = () => {
  return useRequest({
    path: `${API_BASE_PATH}policies`,
    method: 'get',
  });
};

export const useLoadPolicy = (name: SlmPolicy['name']) => {
  return useRequest({
    path: `${API_BASE_PATH}policy/${encodeURIComponent(name)}`,
    method: 'get',
  });
};

export const useLoadIndices = () => {
  return useRequest<PolicyIndicesResponse>({
    path: `${API_BASE_PATH}policies/indices`,
    method: 'get',
  });
};

export const executePolicy = async (name: SlmPolicy['name']) => {
  const result = sendRequest({
    path: `${API_BASE_PATH}policy/${encodeURIComponent(name)}/run`,
    method: 'post',
  });

  uiMetricService.trackUiMetric(UIM_POLICY_EXECUTE);
  return result;
};

export const deletePolicies = async (names: Array<SlmPolicy['name']>) => {
  const result = sendRequest({
    path: `${API_BASE_PATH}policies/${names.map((name) => encodeURIComponent(name)).join(',')}`,
    method: 'delete',
  });

  uiMetricService.trackUiMetric(names.length > 1 ? UIM_POLICY_DELETE_MANY : UIM_POLICY_DELETE);
  return result;
};

export const addPolicy = async (newPolicy: SlmPolicyPayload) => {
  const result = sendRequest({
    path: `${API_BASE_PATH}policies`,
    method: 'post',
    body: newPolicy,
  });

  uiMetricService.trackUiMetric(UIM_POLICY_CREATE);
  return result;
};

export const editPolicy = async (editedPolicy: SlmPolicyPayload) => {
  const result = await sendRequest({
    path: `${API_BASE_PATH}policies/${encodeURIComponent(editedPolicy.name)}`,
    method: 'put',
    body: editedPolicy,
  });

  uiMetricService.trackUiMetric(UIM_POLICY_UPDATE);
  return result;
};

export const useLoadRetentionSettings = () => {
  return useRequest({
    path: `${API_BASE_PATH}policies/retention_settings`,
    method: 'get',
  });
};

export const updateRetentionSchedule = (retentionSchedule: string) => {
  const result = sendRequest({
    path: `${API_BASE_PATH}policies/retention_settings`,
    method: 'put',
    body: {
      retentionSchedule,
    },
  });

  uiMetricService.trackUiMetric(UIM_RETENTION_SETTINGS_UPDATE);
  return result;
};

export const executeRetention = async () => {
  const result = sendRequest({
    path: `${API_BASE_PATH}policies/retention`,
    method: 'post',
  });

  uiMetricService.trackUiMetric(UIM_RETENTION_EXECUTE);
  return result;
};

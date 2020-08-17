/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { METRIC_TYPE } from '@kbn/analytics';

import {
  UIM_POLICY_DELETE,
  UIM_POLICY_ATTACH_INDEX,
  UIM_POLICY_ATTACH_INDEX_TEMPLATE,
  UIM_POLICY_DETACH_INDEX,
  UIM_INDEX_RETRY_STEP,
} from '../constants/ui_metric';

import { trackUiMetric } from './ui_metric';
import { sendGet, sendPost, sendDelete, useRequest } from './http';
import { PolicyFromES, SerializedPolicy } from './policies/types';

interface GenericObject {
  [key: string]: any;
}

export const useLoadNodes = () => {
  return useRequest({
    path: `nodes/list`,
    method: 'get',
    initialData: [],
  });
};

export const useLoadNodeDetails = (selectedNodeAttrs: string) => {
  return useRequest({
    path: `nodes/${selectedNodeAttrs}/details`,
    method: 'get',
  });
};

export async function loadIndexTemplates() {
  return await sendGet(`templates`);
}

export async function loadPolicies(withIndices: boolean) {
  return await sendGet('policies', { withIndices });
}

export const useLoadPoliciesList = (withIndices: boolean) => {
  return useRequest<PolicyFromES[]>({
    path: `policies`,
    method: 'get',
    query: { withIndices },
  });
};

export async function savePolicy(policy: SerializedPolicy) {
  return await sendPost(`policies`, policy);
}

export async function deletePolicy(policyName: string) {
  const response = await sendDelete(`policies/${encodeURIComponent(policyName)}`);
  // Only track successful actions.
  trackUiMetric(METRIC_TYPE.COUNT, UIM_POLICY_DELETE);
  return response;
}

export const retryLifecycleForIndex = async (indexNames: string[]) => {
  const response = await sendPost(`index/retry`, { indexNames });
  // Only track successful actions.
  trackUiMetric(METRIC_TYPE.COUNT, UIM_INDEX_RETRY_STEP);
  return response;
};

export const removeLifecycleForIndex = async (indexNames: string[]) => {
  const response = await sendPost(`index/remove`, { indexNames });
  // Only track successful actions.
  trackUiMetric(METRIC_TYPE.COUNT, UIM_POLICY_DETACH_INDEX);
  return response;
};

export const addLifecyclePolicyToIndex = async (body: GenericObject) => {
  const response = await sendPost(`index/add`, body);
  // Only track successful actions.
  trackUiMetric(METRIC_TYPE.COUNT, UIM_POLICY_ATTACH_INDEX);
  return response;
};

export const addLifecyclePolicyToTemplate = async (body: GenericObject) => {
  const response = await sendPost(`template`, body);
  // Only track successful actions.
  trackUiMetric(METRIC_TYPE.COUNT, UIM_POLICY_ATTACH_INDEX_TEMPLATE);
  return response;
};

export const useLoadSnapshotPolicies = () => {
  return useRequest({
    path: `snapshot_policies`,
    method: 'get',
    initialData: [],
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { METRIC_TYPE } from '@kbn/analytics';

import { PolicyFromES, SerializedPolicy, ListNodesRouteResponse } from '../../../common/types';

import {
  UIM_POLICY_DELETE,
  UIM_POLICY_ATTACH_INDEX,
  UIM_POLICY_ATTACH_INDEX_TEMPLATE,
  UIM_POLICY_DETACH_INDEX,
  UIM_INDEX_RETRY_STEP,
} from '../constants';
import { trackUiMetric } from './ui_metric';
import { sendGet, sendPost, sendDelete, useRequest } from './http';
import { IndexSettings } from '../../../../index_management/common/types';

export const useLoadNodes = () => {
  return useRequest<ListNodesRouteResponse>({
    path: `nodes/list`,
    method: 'get',
    initialData: { nodesByAttributes: {}, nodesByRoles: {} } as ListNodesRouteResponse,
  });
};

export const useLoadNodeDetails = (selectedNodeAttrs: string) => {
  return useRequest({
    path: `nodes/${selectedNodeAttrs}/details`,
    method: 'get',
  });
};

export const useLoadIndexTemplates = (legacy: boolean = false) => {
  return useRequest<Array<{ name: string; settings: IndexSettings }>>({
    path: 'templates',
    query: { legacy },
    method: 'get',
    initialData: [],
  });
};

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

export const addLifecyclePolicyToIndex = async (body: {
  indexName: string;
  policyName: string;
  alias: string;
}) => {
  const response = await sendPost(`index/add`, body);
  // Only track successful actions.
  trackUiMetric(METRIC_TYPE.COUNT, UIM_POLICY_ATTACH_INDEX);
  return response;
};

export const addLifecyclePolicyToTemplate = async (
  body: {
    policyName: string;
    templateName: string;
    aliasName?: string;
  },
  legacy: boolean = false
) => {
  const response = await sendPost(`template`, body, { legacy });
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

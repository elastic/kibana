/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';
import {
  UA_POLICY_DELETE,
  UA_POLICY_ATTACH_INDEX,
  UA_POLICY_ATTACH_INDEX_TEMPLATE,
  UA_POLICY_DETACH_INDEX,
  UA_INDEX_RETRY_STEP,
} from '../../common/constants';
import { trackUserAction } from './user_action';

let httpClient;
export const setHttpClient = (client) => {
  httpClient = client;
};
export const getHttpClient = () => {
  return httpClient;
};
const apiPrefix = chrome.addBasePath('/api/index_lifecycle_management');

export async function loadNodes(httpClient = getHttpClient()) {
  const response = await httpClient.get(`${apiPrefix}/nodes/list`);
  return response.data;
}

export async function loadNodeDetails(selectedNodeAttrs, httpClient = getHttpClient()) {
  const response = await httpClient.get(`${apiPrefix}/nodes/${selectedNodeAttrs}/details`);
  return response.data;
}

export async function loadIndexTemplates(httpClient = getHttpClient()) {
  const response = await httpClient.get(`${apiPrefix}/templates`);
  return response.data;
}

export async function loadIndexTemplate(templateName, httpClient = getHttpClient()) {
  if (!templateName) {
    return {};
  }
  const response = await httpClient.get(`${apiPrefix}/template/${templateName}`);
  return response.data;
}

export async function loadPolicies(withIndices, httpClient = getHttpClient()) {
  const response = await httpClient.get(`${apiPrefix}/policies${ withIndices ? '?withIndices=true' : ''}`);
  return response.data;
}

export async function deletePolicy(policyName, httpClient = getHttpClient()) {
  const response = await httpClient.delete(`${apiPrefix}/policies/${encodeURIComponent(policyName)}`);
  // Only track successful actions.
  trackUserAction(UA_POLICY_DELETE, httpClient);
  return response.data;
}

export async function saveLifecycle(lifecycle, httpClient = getHttpClient()) {
  const response = await httpClient.post(`${apiPrefix}/lifecycle`, { lifecycle });
  return response.data;
}

export async function getAffectedIndices(indexTemplateName, policyName, httpClient = getHttpClient()) {
  const path = policyName
    ? `${apiPrefix}/indices/affected/${indexTemplateName}/${encodeURIComponent(policyName)}`
    : `${apiPrefix}/indices/affected/${indexTemplateName}`;
  const response = await httpClient.get(path);
  return response.data;
}

export const retryLifecycleForIndex = async (indexNames, httpClient = getHttpClient()) => {
  const response = await httpClient.post(`${apiPrefix}/index/retry`, { indexNames });
  // Only track successful actions.
  trackUserAction(UA_INDEX_RETRY_STEP, httpClient);
  return response.data;
};

export const removeLifecycleForIndex = async (indexNames, httpClient = getHttpClient()) => {
  const response = await httpClient.post(`${apiPrefix}/index/remove`, { indexNames });
  // Only track successful actions.
  trackUserAction(UA_POLICY_DETACH_INDEX, httpClient);
  return response.data;
};

export const addLifecyclePolicyToIndex = async (body, httpClient = getHttpClient()) => {
  const response = await httpClient.post(`${apiPrefix}/index/add`, body);
  // Only track successful actions.
  trackUserAction(UA_POLICY_ATTACH_INDEX, httpClient);
  return response.data;
};

export const addLifecyclePolicyToTemplate = async (body, httpClient = getHttpClient()) => {
  const response = await httpClient.post(`${apiPrefix}/template`, body);
  // Only track successful actions.
  trackUserAction(UA_POLICY_ATTACH_INDEX_TEMPLATE, httpClient);
  return response.data;
};

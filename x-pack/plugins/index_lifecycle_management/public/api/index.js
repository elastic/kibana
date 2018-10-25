/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
let httpClient;
export const setHttpClient = (client) => {
  httpClient = client;
};
const apiPrefix = chrome.addBasePath('/api/index_lifecycle_management');

export async function loadNodes() {
  const response = await httpClient.get(`${apiPrefix}/nodes/list`);
  return response.data;
}

export async function loadNodeDetails(selectedNodeAttrs) {
  const response = await httpClient.get(`${apiPrefix}/nodes/${selectedNodeAttrs}/details`);
  return response.data;
}

export async function loadIndexTemplates() {
  const response = await httpClient.get(`${apiPrefix}/templates`);
  return response.data;
}

export async function loadIndexTemplate(templateName) {
  if (!templateName) {
    return {};
  }
  const response = await httpClient.get(`${apiPrefix}/template/${templateName}`);
  return response.data;
}

export async function loadPolicies(withIndices) {
  const response = await httpClient.get(`${apiPrefix}/policies${ withIndices ? '?withIndices=true' : ''}`);
  return response.data;
}

export async function deletePolicy(policyName) {
  const response = await httpClient.delete(`${apiPrefix}/policies/${policyName}`);
  return response.data;
}

export async function saveLifecycle(lifecycle) {
  const response = await httpClient.post(`${apiPrefix}/lifecycle`, { lifecycle });
  return response.data;
}


export async function getAffectedIndices(indexTemplateName, policyName) {
  const path = policyName
    ? `${apiPrefix}/indices/affected/${indexTemplateName}/${encodeURIComponent(policyName)}`
    : `${apiPrefix}/indices/affected/${indexTemplateName}`;
  const response = await httpClient.get(path);
  return response.data;
}

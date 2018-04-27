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

export async function loadIndexTemplates() {
  const response = await httpClient.get(`${apiPrefix}/templates`);
  return response.data;
}

export async function loadIndexTemplate(templateName) {
  const response = await httpClient.get(`${apiPrefix}/template/${templateName}`);
  return response.data;
}

export async function loadPolicies() {
  const response = await httpClient.get(`${apiPrefix}/policies`);
  return response.data;
}

export async function saveLifecycle(lifecycle, indexTemplatePatch) {
  const response = await httpClient.post(`${apiPrefix}/lifecycle`, { lifecycle, indexTemplatePatch });
  return response.data;
}

export async function bootstrap(indexName, aliasName) {
  const response = await httpClient.post(`${apiPrefix}/indices/bootstrap`, { indexName, aliasName });
  return response.data;
}

export async function getAffectedIndices(indexTemplateName, policyName) {
  const response = await httpClient.get(`${apiPrefix}/indices/affected/${indexTemplateName}/${policyName}`);
  return response.data;
}

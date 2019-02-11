/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  API_ROUTE_WORKPAD,
  API_ROUTE_WORKPAD_ASSETS,
  API_ROUTE_WORKPAD_STRUCTURES,
} from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}${API_ROUTE_WORKPAD}`;
const apiPathAssets = `${basePath}${API_ROUTE_WORKPAD_ASSETS}`;
const apiPathStructures = `${basePath}${API_ROUTE_WORKPAD_STRUCTURES}`;

export function create(workpad) {
  return fetch.post(apiPath, { ...workpad, assets: workpad.assets || {} });
}

export function get(workpadId) {
  return fetch.get(`${apiPath}/${workpadId}`).then(({ data: workpad }) => workpad);
}

export function update(id, workpad) {
  return fetch.put(`${apiPath}/${id}`, workpad);
}

export function updateWorkpad(id, workpad) {
  return fetch.put(`${apiPathStructures}/${id}`, workpad);
}

export function updateAssets(id, workpadAssets) {
  return fetch.put(`${apiPathAssets}/${id}`, workpadAssets);
}

export function remove(id) {
  return fetch.delete(`${apiPath}/${id}`);
}

export function find(searchTerm) {
  const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

  return fetch
    .get(`${apiPath}/find?name=${validSearchTerm ? searchTerm : ''}&perPage=10000`)
    .then(({ data: workpads }) => workpads);
}

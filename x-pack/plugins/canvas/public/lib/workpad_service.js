/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  API_ROUTE_WORKPAD,
  API_ROUTE_WORKPAD_ASSETS,
  API_ROUTE_WORKPAD_STRUCTURES,
  DEFAULT_WORKPAD_CSS,
} from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';
import { platformService } from '../services';
/*
  Remove any top level keys from the workpad which will be rejected by validation
*/
const validKeys = [
  '@created',
  '@timestamp',
  'assets',
  'colors',
  'css',
  'variables',
  'height',
  'id',
  'isWriteable',
  'name',
  'page',
  'pages',
  'width',
];

const sanitizeWorkpad = function (workpad) {
  const workpadKeys = Object.keys(workpad);

  for (const key of workpadKeys) {
    if (!validKeys.includes(key)) {
      delete workpad[key];
    }
  }

  return workpad;
};

const getApiPath = function () {
  const basePath = platformService.getService().coreStart.http.basePath.get();
  return `${basePath}${API_ROUTE_WORKPAD}`;
};

const getApiPathStructures = function () {
  const basePath = platformService.getService().coreStart.http.basePath.get();
  return `${basePath}${API_ROUTE_WORKPAD_STRUCTURES}`;
};

const getApiPathAssets = function () {
  const basePath = platformService.getService().coreStart.http.basePath.get();
  return `${basePath}${API_ROUTE_WORKPAD_ASSETS}`;
};

export function create(workpad) {
  return fetch.post(getApiPath(), {
    ...sanitizeWorkpad({ ...workpad }),
    assets: workpad.assets || {},
    variables: workpad.variables || [],
  });
}

export async function createFromTemplate(templateId) {
  return fetch.post(getApiPath(), {
    templateId,
  });
}

export function get(workpadId) {
  return fetch.get(`${getApiPath()}/${workpadId}`).then(({ data: workpad }) => {
    // shim old workpads with new properties
    return { css: DEFAULT_WORKPAD_CSS, variables: [], ...workpad };
  });
}

// TODO: I think this function is never used.  Look into and remove the corresponding route as well
export function update(id, workpad) {
  return fetch.put(`${getApiPath()}/${id}`, sanitizeWorkpad({ ...workpad }));
}

export function updateWorkpad(id, workpad) {
  return fetch.put(`${getApiPathStructures()}/${id}`, sanitizeWorkpad({ ...workpad }));
}

export function updateAssets(id, workpadAssets) {
  return fetch.put(`${getApiPathAssets()}/${id}`, workpadAssets);
}

export function remove(id) {
  return fetch.delete(`${getApiPath()}/${id}`);
}

export function find(searchTerm) {
  const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

  return fetch
    .get(`${getApiPath()}/find?name=${validSearchTerm ? searchTerm : ''}&perPage=10000`)
    .then(({ data: workpads }) => workpads);
}

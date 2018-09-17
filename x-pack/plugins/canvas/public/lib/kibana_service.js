/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { API_ROUTE_KIBANA } from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}${API_ROUTE_KIBANA}`;

export function getSavedVisualizations(searchTerm, { page = 1, perPage = 10000 } = {}) {
  const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

  return fetch
    .get(
      `${apiPath}/savedVisualizations?name=${
        validSearchTerm ? searchTerm : ''
      }&page=${page}&perPage=${perPage}`
    )
    .then(({ data: objects }) => objects);
}

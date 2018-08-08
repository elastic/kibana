/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
export function requestFixture({
  headers = { accept: 'something/html' },
  path = '/wat',
  search = '',
  payload
} = {}) {
  return {
    raw: { req: { headers } },
    headers,
    url: { path, search },
    query: search ? url.parse(search, { parseQueryString: true }).query : {},
    payload,
    state: { user: 'these are the contents of the user client cookie' }
  };
}

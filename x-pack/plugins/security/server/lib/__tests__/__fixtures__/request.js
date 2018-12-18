/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { stub } from 'sinon';
import { LoginAttempt } from '../../authentication/login_attempt';

export function requestFixture({
  headers = { accept: 'something/html' },
  auth = undefined,
  params = undefined,
  path = '/wat',
  basePath = '',
  search = '',
  payload
} = {}) {
  return {
    raw: { req: { headers } },
    auth,
    headers,
    params,
    url: { path, search },
    getBasePath: () => basePath,
    loginAttempt: stub().returns(new LoginAttempt()),
    query: search ? url.parse(search, { parseQueryString: true }).query : {},
    payload,
    state: { user: 'these are the contents of the user client cookie' }
  };
}

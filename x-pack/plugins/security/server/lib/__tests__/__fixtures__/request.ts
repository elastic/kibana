/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { stub } from 'sinon';
import url from 'url';
import { LoginAttempt } from '../../authentication/login_attempt';

interface RequestFixtureOptions {
  headers?: Record<string, string>;
  auth?: string;
  params?: Record<string, unknown>;
  path?: string;
  basePath?: string;
  search?: string;
  payload?: unknown;
}

export function requestFixture({
  headers = { accept: 'something/html' },
  auth,
  params,
  path = '/wat',
  basePath = '',
  search = '',
  payload,
}: RequestFixtureOptions = {}) {
  return ({
    raw: { req: { headers } },
    auth,
    headers,
    params,
    url: { path, search },
    getBasePath: () => basePath,
    loginAttempt: stub().returns(new LoginAttempt()),
    query: search ? url.parse(search, true /* parseQueryString */).query : {},
    payload,
    state: { user: 'these are the contents of the user client cookie' },
  } as any) as Request & { loginAttempt: () => LoginAttempt; getBasePath: () => string };
}

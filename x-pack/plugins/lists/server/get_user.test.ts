/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { KibanaRequest } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import { getUser } from './get_user';

describe('get_user', () => {
  let request = KibanaRequest.from(httpServerMock.createRawRequest({}));
  beforeEach(() => {
    jest.clearAllMocks();
    request = KibanaRequest.from(httpServerMock.createRawRequest({}));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns "bob" as the user given a security request with "bob"', () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser = jest.fn().mockReturnValue({ username: 'bob' });
    const user = getUser({ request, security });
    expect(user).toEqual('bob');
  });

  test('it returns "alice" as the user given a security request with "alice"', () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser = jest.fn().mockReturnValue({ username: 'alice' });
    const user = getUser({ request, security });
    expect(user).toEqual('alice');
  });

  test('it returns "elastic" as the user given null as the current user', () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser = jest.fn().mockReturnValue(null);
    const user = getUser({ request, security });
    expect(user).toEqual('elastic');
  });

  test('it returns "elastic" as the user given undefined as the current user', () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser = jest.fn().mockReturnValue(undefined);
    const user = getUser({ request, security });
    expect(user).toEqual('elastic');
  });

  test('it returns "elastic" as the user given undefined as the plugin', () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser = jest.fn().mockReturnValue(undefined);
    const user = getUser({ request, security: undefined });
    expect(user).toEqual('elastic');
  });

  test('it returns "elastic" as the user given null as the plugin', () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser = jest.fn().mockReturnValue(undefined);
    const user = getUser({ request, security: null });
    expect(user).toEqual('elastic');
  });
});

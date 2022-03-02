/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { alertingAuthorizationMock } from '../../../alerting/server/authorization/alerting_authorization.mock';
import { ReadOperations } from '../../../alerting/server';
import { getAuthzFilter } from './get_authz_filter';

describe('getAuthzFilter()', () => {
  it('should call `getAuthorizationFilter`', async () => {
    const authorization = alertingAuthorizationMock.create();
    authorization.getAuthorizationFilter.mockImplementationOnce(async () => {
      return { filter: { test: true }, ensureRuleTypeIsAuthorized: () => {} };
    });
    const filter = await getAuthzFilter(authorization, ReadOperations.Find);
    expect(filter).toStrictEqual({ test: true });
  });
});

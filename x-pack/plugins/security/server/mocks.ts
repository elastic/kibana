/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { ApiResponse } from '@elastic/elasticsearch';
import { authenticationServiceMock } from './authentication/authentication_service.mock';
import { authorizationMock } from './authorization/index.mock';
import { licenseMock } from '../common/licensing/index.mock';
import { auditServiceMock } from './audit/index.mock';

function createSetupMock() {
  const mockAuthz = authorizationMock.create();
  return {
    audit: auditServiceMock.create(),
    authc: authenticationServiceMock.createSetup(),
    authz: {
      actions: mockAuthz.actions,
      checkPrivilegesWithRequest: mockAuthz.checkPrivilegesWithRequest,
      checkPrivilegesDynamicallyWithRequest: mockAuthz.checkPrivilegesDynamicallyWithRequest,
      mode: mockAuthz.mode,
    },
    registerSpacesService: jest.fn(),
    license: licenseMock.create(),
  };
}

function createStartMock() {
  const mockAuthz = authorizationMock.create();
  const mockAuthc = authenticationServiceMock.createStart();
  return {
    authc: {
      apiKeys: mockAuthc.apiKeys,
      getCurrentUser: mockAuthc.getCurrentUser,
    },
    authz: {
      actions: mockAuthz.actions,
      checkPrivilegesWithRequest: mockAuthz.checkPrivilegesWithRequest,
      checkPrivilegesDynamicallyWithRequest: mockAuthz.checkPrivilegesDynamicallyWithRequest,
      mode: mockAuthz.mode,
    },
  };
}

function createApiResponseMock<TResponse, TContext>(
  apiResponse: Pick<ApiResponse<TResponse, TContext>, 'body'> &
    Partial<Omit<ApiResponse<TResponse, TContext>, 'body'>>
): ApiResponse<TResponse, TContext> {
  return {
    statusCode: null,
    headers: null,
    warnings: null,
    meta: {} as any,
    ...apiResponse,
  };
}

export const securityMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
  createApiResponse: createApiResponseMock,
};

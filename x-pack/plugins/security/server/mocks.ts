/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiResponse } from '@elastic/elasticsearch';

import { licenseMock } from '../common/licensing/index.mock';
import type { MockAuthenticatedUserProps } from '../common/model/authenticated_user.mock';
import { mockAuthenticatedUser } from '../common/model/authenticated_user.mock';
import { auditServiceMock } from './audit/index.mock';
import { authenticationServiceMock } from './authentication/authentication_service.mock';
import { authorizationMock } from './authorization/index.mock';
import { sessionUserDataStorageMock } from './session_management/session_user_data_storage.mock';

function createSetupMock() {
  const mockAuthz = authorizationMock.create();
  return {
    audit: auditServiceMock.create(),
    authc: { getCurrentUser: jest.fn() },
    authz: {
      actions: mockAuthz.actions,
      checkPrivilegesWithRequest: mockAuthz.checkPrivilegesWithRequest,
      checkPrivilegesDynamicallyWithRequest: mockAuthz.checkPrivilegesDynamicallyWithRequest,
      mode: mockAuthz.mode,
    },
    registerSpacesService: jest.fn(),
    license: licenseMock.create(),
    session: { userData: { registerScope: jest.fn() } },
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
    session: {
      hasActiveSession: jest.fn(),
      userData: { getStorage: jest.fn().mockReturnValue(sessionUserDataStorageMock.create()) },
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
  createMockAuthenticatedUser: (props: MockAuthenticatedUserProps = {}) =>
    mockAuthenticatedUser(props),
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult } from '@elastic/elasticsearch';

import { licenseMock } from '../common/licensing/index.mock';
import type { MockAuthenticatedUserProps } from '../common/model/authenticated_user.mock';
import { mockAuthenticatedUser } from '../common/model/authenticated_user.mock';
import { auditServiceMock } from './audit/mocks';
import { authenticationServiceMock } from './authentication/authentication_service.mock';
import { authorizationMock } from './authorization/index.mock';

function createSetupMock() {
  const mockAuthz = authorizationMock.create();
  return {
    audit: auditServiceMock.create(),
    authc: { getCurrentUser: jest.fn() },
    authz: {
      actions: mockAuthz.actions,
      checkPrivilegesWithRequest: mockAuthz.checkPrivilegesWithRequest,
      checkPrivilegesDynamicallyWithRequest: mockAuthz.checkPrivilegesDynamicallyWithRequest,
      checkSavedObjectsPrivilegesWithRequest: mockAuthz.checkSavedObjectsPrivilegesWithRequest,
      mode: mockAuthz.mode,
    },
    registerSpacesService: jest.fn(),
    license: licenseMock.create(),
    privilegeDeprecationsService: {
      getKibanaRolesByFeatureId: jest.fn(),
    },
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
      checkSavedObjectsPrivilegesWithRequest: mockAuthz.checkSavedObjectsPrivilegesWithRequest,
      mode: mockAuthz.mode,
    },
  };
}

function createApiResponseMock<TResponse, TContext>(
  apiResponse: Pick<TransportResult<TResponse, TContext>, 'body'> &
    Partial<Omit<TransportResult<TResponse, TContext>, 'body'>>
): TransportResult<TResponse, TContext> {
  return {
    // @ts-expect-error null is not supported
    statusCode: null,
    // @ts-expect-error null is not supported
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

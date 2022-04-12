/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import {
  coreMock,
  httpResourcesMock,
  httpServiceMock,
  loggingSystemMock,
} from 'src/core/server/mocks';

import { licensingMock } from '../../../licensing/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';
import { authenticationServiceMock } from '../authentication/authentication_service.mock';
import { authorizationMock } from '../authorization/index.mock';
import { ConfigSchema, createConfig } from '../config';
import { sessionMock } from '../session_management/session.mock';
import type { SecurityRequestHandlerContext } from '../types';
import type { RouteDefinitionParams } from './';

export const routeDefinitionParamsMock = {
  create: (rawConfig: Record<string, unknown> = {}) => {
    const config = createConfig(
      ConfigSchema.validate(rawConfig),
      loggingSystemMock.create().get(),
      { isTLSEnabled: false }
    );
    return {
      router: httpServiceMock.createRouter(),
      basePath: httpServiceMock.createBasePath(),
      csp: httpServiceMock.createSetupContract().csp,
      logger: loggingSystemMock.create().get(),
      config,
      config$: new BehaviorSubject(config).asObservable(),
      authz: authorizationMock.create(),
      license: licenseMock.create(),
      httpResources: httpResourcesMock.createRegistrar(),
      getFeatures: jest.fn(),
      getFeatureUsageService: jest.fn(),
      getSession: jest.fn().mockReturnValue(sessionMock.create()),
      getAuthenticationService: jest.fn().mockReturnValue(authenticationServiceMock.createStart()),
      getAnonymousAccessService: jest.fn(),
    } as unknown as DeeplyMockedKeys<RouteDefinitionParams>;
  },
};

export const securityRequestHandlerContextMock = {
  create: (): SecurityRequestHandlerContext =>
    coreMock.createCustomRequestHandlerContext({
      core: coreMock.createRequestHandlerContext(),
      licensing: licensingMock.createRequestHandlerContext(),
    }),
};

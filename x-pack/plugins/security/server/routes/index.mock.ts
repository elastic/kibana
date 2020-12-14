/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import {
  httpServiceMock,
  loggingSystemMock,
  httpResourcesMock,
} from '../../../../../src/core/server/mocks';
import { authorizationMock } from '../authorization/index.mock';
import { ConfigSchema, createConfig } from '../config';
import { licenseMock } from '../../common/licensing/index.mock';
import { authenticationServiceMock } from '../authentication/authentication_service.mock';
import { sessionMock } from '../session_management/session.mock';
import type { RouteDefinitionParams } from '.';

export const routeDefinitionParamsMock = {
  create: (config: Record<string, unknown> = {}) =>
    (({
      router: httpServiceMock.createRouter(),
      basePath: httpServiceMock.createBasePath(),
      csp: httpServiceMock.createSetupContract().csp,
      logger: loggingSystemMock.create().get(),
      config: createConfig(ConfigSchema.validate(config), loggingSystemMock.create().get(), {
        isTLSEnabled: false,
      }),
      authz: authorizationMock.create(),
      license: licenseMock.create(),
      httpResources: httpResourcesMock.createRegistrar(),
      getFeatures: jest.fn(),
      getFeatureUsageService: jest.fn(),
      session: sessionMock.create(),
      getAuthenticationService: jest.fn().mockReturnValue(authenticationServiceMock.createStart()),
    } as unknown) as DeeplyMockedKeys<RouteDefinitionParams>),
};

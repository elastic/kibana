/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingServiceMock,
  httpResourcesMock,
} from '../../../../../src/core/server/mocks';
import { authenticationMock } from '../authentication/index.mock';
import { authorizationMock } from '../authorization/index.mock';
import { ConfigSchema, createConfig } from '../config';
import { licenseMock } from '../../common/licensing/index.mock';

export const routeDefinitionParamsMock = {
  create: (config: Record<string, unknown> = {}) => ({
    router: httpServiceMock.createRouter(),
    basePath: httpServiceMock.createBasePath(),
    csp: httpServiceMock.createSetupContract().csp,
    logger: loggingServiceMock.create().get(),
    clusterClient: elasticsearchServiceMock.createClusterClient(),
    config: createConfig(ConfigSchema.validate(config), loggingServiceMock.create().get(), {
      isTLSEnabled: false,
    }),
    authc: authenticationMock.create(),
    authz: authorizationMock.create(),
    license: licenseMock.create(),
    httpResources: httpResourcesMock.createRegistrar(),
    getFeatures: jest.fn(),
    getFeatureUsageService: jest.fn(),
  }),
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { authenticationMock } from '../authentication/index.mock';
import { authorizationMock } from '../authorization/index.mock';
import { ConfigSchema } from '../config';

export const routeDefinitionParamsMock = {
  create: () => ({
    router: httpServiceMock.createRouter(),
    basePath: httpServiceMock.createBasePath(),
    csp: httpServiceMock.createSetupContract().csp,
    logger: loggingServiceMock.create().get(),
    clusterClient: elasticsearchServiceMock.createClusterClient(),
    config: { ...ConfigSchema.validate({}), encryptionKey: 'some-enc-key' },
    authc: authenticationMock.create(),
    authz: authorizationMock.create(),
  }),
};

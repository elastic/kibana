/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigSchema, createConfig } from '../config';

import { httpServiceMock, loggingSystemMock } from '../../../../../src/core/server/mocks';
import { encryptionKeyRotationServiceMock } from '../crypto/index.mock';

export const routeDefinitionParamsMock = {
  create: (config: Record<string, unknown> = {}) => ({
    router: httpServiceMock.createRouter(),
    logger: loggingSystemMock.create().get(),
    config: createConfig(ConfigSchema.validate(config), loggingSystemMock.create().get()),
    encryptionKeyRotationService: encryptionKeyRotationServiceMock.create(),
  }),
};

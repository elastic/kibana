/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import type { ConfigType } from '../config';
import { ConfigSchema } from '../config';
import { encryptionKeyRotationServiceMock } from '../crypto/index.mock';

export const routeDefinitionParamsMock = {
  create: (config: Record<string, unknown> = {}) => ({
    router: httpServiceMock.createRouter(),
    logger: loggingSystemMock.create().get(),
    config: ConfigSchema.validate(config) as ConfigType,
    encryptionKeyRotationService: encryptionKeyRotationServiceMock.create(),
  }),
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createAuthorizationMock } from '../../../authorization/mock';
import { createCaseServiceMock } from '../../../services/mocks';
import { createCasesClientMock } from '../../mocks';
import type { CasesClientArgs } from '../../types';

export function createMockClient() {
  const client = createCasesClientMock();

  return client;
}

export function createMockClientArgs() {
  const authorization = createAuthorizationMock();
  authorization.getAuthorizationFilter.mockImplementation(async () => {
    return { filter: undefined, ensureSavedObjectsAreAuthorized: () => {} };
  });

  const soClient = savedObjectsClientMock.create();

  const caseService = createCaseServiceMock();
  const logger = loggingSystemMock.createLogger();

  const clientArgs = {
    authorization,
    unsecuredSavedObjectsClient: soClient,
    services: {
      caseService,
    },
    logger,
  };

  return { mockServices: clientArgs, clientArgs: clientArgs as unknown as CasesClientArgs };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createAuthorizationMock } from '../../authorization/mock';
import { createCaseServiceMock } from '../../services/mocks';
import { CasesClientMock, createCasesClientMock } from '../mocks';
import { CasesClientArgs } from '../types';
import { getCasesMetrics } from './get_cases_metrics';

describe('getCasesMetrics', () => {
  let client: CasesClientMock;
  let mockServices: ReturnType<typeof createMockClientArgs>['mockServices'];
  let clientArgs: ReturnType<typeof createMockClientArgs>['clientArgs'];

  beforeEach(() => {
    client = createMockClient();
    ({ mockServices, clientArgs } = createMockClientArgs());

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('MTTR', () => {
    beforeEach(() => {
      mockServices.caseService.executeAggregations.mockResolvedValue({ mttr: { value: 5 } });
    });

    it('returns the mttr metric', async () => {
      const metrics = await getCasesMetrics({ features: ['mttr'] }, client, clientArgs);
      expect(metrics).toEqual({ mttr: 5 });
    });

    it('calls the executeAggregations correctly', async () => {
      await getCasesMetrics(
        {
          features: ['mttr'],
          from: '2022-04-28T15:18:00.000Z',
          to: '2022-04-28T15:22:00.000Z',
          owner: 'cases',
        },
        client,
        clientArgs
      );
      expect(mockServices.caseService.executeAggregations).toHaveBeenCalledWith();
    });
  });
});

function createMockClient() {
  const client = createCasesClientMock();

  return client;
}

function createMockClientArgs() {
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
    caseService,
    logger,
  };

  return { mockServices: clientArgs, clientArgs: clientArgs as unknown as CasesClientArgs };
}

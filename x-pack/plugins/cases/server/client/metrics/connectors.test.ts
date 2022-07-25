/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMock } from '../mocks';
import { CasesClientArgs } from '../types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createUserActionServiceMock } from '../../services/mocks';
import { Connectors } from './connectors';

describe('Connectors', () => {
  const clientMock = createCasesClientMock();
  const logger = loggingSystemMock.createLogger();
  const userActionService = createUserActionServiceMock();
  const getAuthorizationFilter = jest.fn().mockResolvedValue({});

  const clientArgs = {
    logger,
    userActionService,
    authorization: { getAuthorizationFilter },
  } as unknown as CasesClientArgs;

  const constructorOptions = { caseId: 'test-id', casesClient: clientMock, clientArgs };

  beforeAll(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zero as total if the are no connectors', async () => {
    userActionService.getUniqueConnectors.mockResolvedValue([]);
    const handler = new Connectors(constructorOptions);
    expect(await handler.compute()).toEqual({ connectors: { total: 0 } });
  });

  it('returns the correct number of connectors', async () => {
    userActionService.getUniqueConnectors.mockResolvedValue([
      { id: '865b6040-7533-11ec-8bcc-a9fc6f9d63b2' },
      { id: '915c2600-7533-11ec-8bcc-a9fc6f9d63b2' },
      { id: 'b2635b10-63e1-11ec-90af-6fe7d490ff66' },
    ]);

    const handler = new Connectors(constructorOptions);
    expect(await handler.compute()).toEqual({ connectors: { total: 3 } });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsService } from './synthetics_service';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { loggerMock } from './../../../../../../src/core/server/logging/logger.mock';
import { UptimeServerSetup } from '../adapters';

describe('SyntheticsService', () => {
  const mockEsClient = {
    search: jest.fn(),
  };

  const serverMock: UptimeServerSetup = {
    uptimeEsClient: mockEsClient,
    authSavedObjectsClient: {
      bulkUpdate: jest.fn(),
    },
  } as unknown as UptimeServerSetup;

  const logger = loggerMock.create();

  it('inits properly', async () => {
    const service = new SyntheticsService(logger, serverMock, {});
    service.init();

    expect(service.isAllowed).toEqual(false);
    expect(service.locations).toEqual([]);
  });

  it('inits properly with basic auth', async () => {
    const service = new SyntheticsService(logger, serverMock, {
      username: 'dev',
      password: '12345',
    });

    await service.init();

    expect(service.isAllowed).toEqual(true);
  });

  it('inits properly with locations with dev', async () => {
    serverMock.config = { service: { devUrl: 'http://localhost' } };
    const service = new SyntheticsService(logger, serverMock, {
      username: 'dev',
      password: '12345',
    });

    await service.init();

    expect(service.isAllowed).toEqual(true);
    expect(service.locations).toEqual([
      {
        geo: {
          lat: 0,
          lon: 0,
        },
        id: 'localhost',
        label: 'Local Synthetics Service',
        url: 'http://localhost',
      },
    ]);
  });
});

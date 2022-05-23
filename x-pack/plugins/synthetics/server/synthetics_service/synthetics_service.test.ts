/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('axios', () => jest.fn());

import { SyntheticsService, SyntheticsConfig } from './synthetics_service';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { loggerMock } from '@kbn/core/server/logging/logger.mock';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import axios, { AxiosResponse } from 'axios';

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
    expect(service.signupUrl).toEqual(null);
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
        isServiceManaged: true,
      },
    ]);
  });

  describe('addConfig', () => {
    afterEach(() => jest.restoreAllMocks());

    it('saves configs only to the selected locations', async () => {
      serverMock.config = { service: { devUrl: 'http://localhost' } };
      const service = new SyntheticsService(logger, serverMock, {
        username: 'dev',
        password: '12345',
      });

      service.apiClient.locations = [
        {
          id: 'selected',
          label: 'Selected Location',
          url: 'example.com/1',
          geo: {
            lat: 0,
            lon: 0,
          },
          isServiceManaged: true,
        },
        {
          id: 'not selected',
          label: 'Not Selected Location',
          url: 'example.com/2',
          geo: {
            lat: 0,
            lon: 0,
          },
          isServiceManaged: true,
        },
      ];

      jest.spyOn(service, 'getApiKey').mockResolvedValue({ name: 'example', id: 'i', apiKey: 'k' });
      jest.spyOn(service, 'getOutput').mockResolvedValue({ hosts: ['es'], api_key: 'i:k' });

      const payload = {
        type: 'http',
        enabled: true,
        schedule: {
          number: '3',
          unit: 'm',
        },
        name: 'my mon',
        locations: [{ id: 'selected', isServiceManaged: true }],
        urls: 'http://google.com',
        max_redirects: '0',
        password: '',
        proxy_url: '',
        id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
        fields: { config_id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d' },
        fields_under_root: true,
      };

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.addConfig(payload as SyntheticsConfig);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'example.com/1/monitors',
        })
      );
    });
  });
});

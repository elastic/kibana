/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('axios', () => jest.fn());

import { SyntheticsService } from './synthetics_service';
import { loggerMock } from '@kbn/logging-mocks';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import axios, { AxiosResponse } from 'axios';
import times from 'lodash/times';
import { LocationStatus } from '../../common/runtime_types';
import { SyntheticsConfig } from './formatters/format_configs';

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

  const getMockedService = (locationsNum: number = 1) => {
    serverMock.config = { service: { devUrl: 'http://localhost' } };
    const service = new SyntheticsService(logger, serverMock, {
      username: 'dev',
      password: '12345',
    });

    const locations = times(locationsNum).map((n) => {
      return {
        id: `loc-${n}`,
        label: `Location ${n}`,
        url: `example.com/${n}`,
        geo: {
          lat: 0,
          lon: 0,
        },
        isServiceManaged: true,
        status: LocationStatus.GA,
      };
    });

    service.apiClient.locations = locations;

    jest.spyOn(service, 'getApiKey').mockResolvedValue({ name: 'example', id: 'i', apiKey: 'k' });
    jest.spyOn(service, 'getOutput').mockResolvedValue({ hosts: ['es'], api_key: 'i:k' });

    return { service, locations };
  };

  const getFakePayload = (locations: SyntheticsConfig['locations']) => {
    return {
      type: 'http',
      enabled: true,
      schedule: {
        number: '3',
        unit: 'm',
      },
      name: 'my mon',
      locations,
      urls: 'http://google.com',
      max_redirects: '0',
      password: '',
      proxy_url: '',
      id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
      fields: { config_id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d' },
      fields_under_root: true,
    };
  };

  beforeEach(() => {
    (axios as jest.MockedFunction<typeof axios>).mockReset();
  });

  afterEach(() => jest.restoreAllMocks());

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
        status: LocationStatus.EXPERIMENTAL,
      },
    ]);
  });

  describe('addConfig', () => {
    it('saves configs only to the selected locations', async () => {
      const { service, locations } = getMockedService(3);

      const payload = getFakePayload([locations[0]]);

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.addConfig(payload as SyntheticsConfig);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: locations[0].url + '/monitors',
        })
      );
    });
  });

  describe('pushConfigs', () => {
    it('does not include the isEdit flag on normal push requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.pushConfigs([payload] as SyntheticsConfig[]);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_edit: false }),
        })
      );
    });

    it('includes the isEdit flag on edit requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.pushConfigs([payload] as SyntheticsConfig[], true);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_edit: true }),
        })
      );
    });
  });
});

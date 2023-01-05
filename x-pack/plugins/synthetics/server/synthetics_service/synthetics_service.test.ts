/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('axios', () => jest.fn());

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { SyntheticsService } from './synthetics_service';
import { loggerMock } from '@kbn/logging-mocks';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import axios, { AxiosResponse } from 'axios';
import times from 'lodash/times';
import { LocationStatus, HeartbeatConfig } from '../../common/runtime_types';
import { mockEncryptedSO } from './utils/mocks';

const taskManagerSetup = taskManagerMock.createSetup();

describe('SyntheticsService', () => {
  const mockEsClient = {
    search: jest.fn(),
  };

  const logger = loggerMock.create();

  const serverMock: UptimeServerSetup = {
    logger,
    uptimeEsClient: mockEsClient,
    authSavedObjectsClient: {
      bulkUpdate: jest.fn(),
    },
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    },
    encryptedSavedObjects: mockEncryptedSO,
  } as unknown as UptimeServerSetup;

  const getMockedService = (locationsNum: number = 1) => {
    serverMock.config = { service: { devUrl: 'http://localhost' } };
    const service = new SyntheticsService(serverMock);

    const locations = times(locationsNum).map((n) => {
      return {
        id: `loc-${n}`,
        label: `Location ${n}`,
        url: `https://example.com/${n}`,
        geo: {
          lat: 0,
          lon: 0,
        },
        isServiceManaged: true,
        status: LocationStatus.GA,
      };
    });

    service.apiClient.locations = locations;

    jest.spyOn(service, 'getOutput').mockResolvedValue({ hosts: ['es'], api_key: 'i:k' });

    return { service, locations };
  };

  const getFakePayload = (locations: HeartbeatConfig['locations']) => {
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

  it('setup properly', async () => {
    const service = new SyntheticsService(serverMock);
    service.setup(taskManagerSetup);

    expect(service.isAllowed).toEqual(false);
    expect(service.locations).toEqual([]);
    expect(service.signupUrl).toEqual(null);
  });

  it('setup properly with basic auth', async () => {
    const service = new SyntheticsService(serverMock);

    await service.setup(taskManagerSetup);

    expect(service.isAllowed).toEqual(true);
  });

  it('setup properly with locations with dev', async () => {
    serverMock.config = {
      service: {
        devUrl: 'http://localhost',
        username: 'dev',
        password: '12345',
      },
    };
    const service = new SyntheticsService(serverMock);

    await service.setup(taskManagerSetup);

    expect(service.isAllowed).toEqual(true);
    expect(service.locations).toEqual([
      {
        geo: {
          lat: 0,
          lon: 0,
        },
        id: 'localhost',
        isInvalid: false,
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

      await service.addConfig(payload as HeartbeatConfig);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: locations[0].url + '/monitors',
        })
      );
    });
  });

  describe('pushConfigs', () => {
    it('includes the isEdit flag on edit requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.editConfig([payload] as HeartbeatConfig[]);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_edit: true }),
        })
      );
    });
  });
});

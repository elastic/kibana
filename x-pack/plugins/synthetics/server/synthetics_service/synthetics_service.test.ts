/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { SyntheticsService } from './synthetics_service';
import { loggerMock } from '@kbn/logging-mocks';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import axios, { AxiosResponse } from 'axios';
import times from 'lodash/times';
import { LocationStatus, HeartbeatConfig } from '../../common/runtime_types';
import { formatLocationObjects } from './get_service_locations';
import { syntheticsServiceAPIKeySavedObject } from '../legacy_uptime/lib/saved_objects/service_api_key';

jest.mock('axios');

const mockLocation = {
  throttling: {
    download: 20,
    upload: 10,
    latency: 5000,
  },
  locations: {
    us_central: {
      url: 'https://location.dev.com',
      geo: {
        name: 'North America - US Central',
        location: {
          lat: 414.25,
          lon: -333.86,
        },
      },
      status: 'ga',
    },
    us_central_qa: {
      geo: {
        location: {
          lat: 353.25,
          lon: -444.86,
        },
        name: 'US Central QA',
      },
      status: 'ga',
      url: 'https://location.qa.com',
    },
  },
} as any;

describe('SyntheticsService', () => {
  const mockEsClient = {
    search: jest.fn(),
  };
  const taskManagerSetup = taskManagerMock.createSetup();

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
    taskManagerSetup,
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

    jest.spyOn(service, 'getApiKey').mockResolvedValue({ name: 'example', id: 'i', apiKey: 'k' });
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
    serverMock.taskManagerSetup = taskManagerMock.createSetup();
    serverMock.taskManagerStart = taskManagerMock.createStart();
  });

  afterEach(() => jest.restoreAllMocks());

  it('setup properly', async () => {
    const service = new SyntheticsService(serverMock);
    service.setup();

    expect(service.isAllowed).toEqual(false);
    expect(service.locations).toEqual([]);
    expect(service.signupUrl).toEqual(null);
  });

  it('setup properly with basic auth', async () => {
    const service = new SyntheticsService(serverMock);
    await service.setup();
    await service.initCloudSetup();
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

    await service.setup();
    await service.initCloudSetup();

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

  it('setup properly with locations with manifest url', async () => {
    serverMock.config = {
      service: {
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    };
    const service = new SyntheticsService(serverMock);

    // @ts-ignore
    axios.get.mockImplementation((opts) => {
      if (opts.includes('allowed')) {
        return Promise.resolve({ data: { allowed: true } } as AxiosResponse);
      }
      return Promise.resolve({
        data: mockLocation,
      } as AxiosResponse);
    });

    await service.setup();
    await service.enableSyntheticsService();

    expect(service.isAllowed).toEqual(true);
    expect(service.locations).toEqual(
      formatLocationObjects(Object.entries(mockLocation.locations))
    );

    expect(serverMock.taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(serverMock.taskManagerStart.ensureScheduled).toHaveBeenCalledTimes(1);
  });

  it('resume task after kibana start', async () => {
    serverMock.config = {
      service: {
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    };
    const service = new SyntheticsService(serverMock);

    // @ts-ignore
    axios.get.mockImplementation((opts) => {
      if (opts.includes('allowed')) {
        return Promise.resolve({ data: { allowed: true } } as AxiosResponse);
      }
      return Promise.resolve({
        data: mockLocation,
      } as AxiosResponse);
    });

    await service.setup();

    syntheticsServiceAPIKeySavedObject.get = async () => ({
      apiKey: '12345',
      id: '12345',
      name: '12345',
    });

    await service.resumeServiceTaskIfEnabled();

    expect(service.isAllowed).toEqual(true);
    expect(service.locations).toEqual(
      formatLocationObjects(Object.entries(mockLocation.locations))
    );

    expect(serverMock.taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(serverMock.taskManagerStart.ensureScheduled).toHaveBeenCalledTimes(1);
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

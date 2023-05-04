/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CoreStart } from '@kbn/core/server';
import { SyntheticsService } from './synthetics_service';
import { loggerMock } from '@kbn/logging-mocks';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import axios, { AxiosResponse } from 'axios';
import times from 'lodash/times';
import { LocationStatus, HeartbeatConfig } from '../../common/runtime_types';
import { mockEncryptedSO } from './utils/mocks';
import * as apiKeys from './get_api_key';

jest.mock('axios', () => jest.fn());

const taskManagerSetup = taskManagerMock.createSetup();

const mockCoreStart = coreMock.createStart() as CoreStart;

mockCoreStart.elasticsearch.client.asInternalUser.license.get = jest.fn().mockResolvedValue({
  license: {
    status: 'active',
    uid: 'c5788419-1c6f-424a-9217-da7a0a9151a0',
    type: 'platinum',
    issue_date: '2022-11-29T00:00:00.000Z',
    issue_date_in_millis: 1669680000000,
    expiry_date: '2024-12-31T23:59:59.999Z',
    expiry_date_in_millis: 1735689599999,
    max_nodes: 100,
    max_resource_units: null,
    issued_to: 'Elastic - INTERNAL (development environments)',
    issuer: 'API',
    start_date_in_millis: 1669680000000,
  },
});

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
    secrets: '{}',
  };
};

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
      enabled: true,
    },
    coreStart: mockCoreStart,
    encryptedSavedObjects: mockEncryptedSO(),
    savedObjectsClient: savedObjectsClientMock.create()!,
  } as unknown as UptimeServerSetup;

  const getMockedService = (locationsNum: number = 1) => {
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
    serverMock.config = {
      service: {
        devUrl: 'http://localhost',
        manifestUrl: 'https://test-manifest.com',
      },
      enabled: true,
    };
    if (serverMock.savedObjectsClient) {
      serverMock.savedObjectsClient.find = jest.fn().mockResolvedValue({
        saved_objects: [
          getFakePayload([
            {
              id: `loc-1`,
              label: `Location 1`,
              url: `https://example.com/1`,
              geo: {
                lat: 0,
                lon: 0,
              },
              isServiceManaged: true,
              status: LocationStatus.GA,
            },
          ]),
        ],
        total: 1,
        per_page: 20,
        page: 1,
      });
    }
    const service = new SyntheticsService(serverMock);

    service.apiClient.locations = locations;

    jest.spyOn(service, 'getOutput').mockResolvedValue({ hosts: ['es'], api_key: 'i:k' });

    return { service, locations };
  };

  beforeEach(() => {
    (axios as jest.MockedFunction<typeof axios>).mockReset();
    jest.clearAllMocks();
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
      enabled: true,
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

      await service.addConfig({ monitor: payload } as any);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: locations[0].url + '/monitors',
        })
      );
    });
  });

  describe('apiKey errors', () => {
    jest.spyOn(apiKeys, 'getAPIKeyForSyntheticsService').mockResolvedValue({
      isValid: false,
    });
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does not call api and does not throw error when monitors.length === 0', async () => {
      const { service } = getMockedService();
      jest.spyOn(service, 'getOutput').mockRestore();

      serverMock.encryptedSavedObjects = mockEncryptedSO(null) as any;

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.pushConfigs();

      expect(axios).not.toHaveBeenCalled();

      expect(serverMock.logger.error).not.toBeCalledWith(
        'API key is not valid. Cannot push monitor configuration to synthetics public testing locations'
      );
    });

    it('throws error when api key is invalid and monitors.length > 0', async () => {
      const { service, locations } = getMockedService();
      jest.spyOn(service, 'getOutput').mockRestore();

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        attributes: getFakePayload([locations[0]]),
      }) as any;

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.pushConfigs();

      expect(serverMock.logger.error).toBeCalledWith(
        'API key is not valid. Cannot push monitor configuration to synthetics public testing locations'
      );
    });
  });

  describe('pushConfigs', () => {
    it('includes the isEdit flag on edit requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.editConfig({ monitor: payload } as any);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_edit: true }),
        })
      );
    });

    it('includes the license level flag on edit requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.editConfig({ monitor: payload } as any);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ license_level: 'platinum' }),
        })
      );
    });

    it('includes the license level flag on add config requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.addConfig({ monitor: payload } as any);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ license_level: 'platinum' }),
        })
      );
    });

    it('includes the license level flag on push configs requests', async () => {
      const { service, locations } = getMockedService();

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        attributes: getFakePayload([locations[0]]),
      }) as any;

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.pushConfigs();

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ license_level: 'platinum' }),
        })
      );
    });

    it.each([
      [true, 'Cannot sync monitors with the Synthetics service. License is expired.'],
      [
        false,
        'Cannot sync monitors with the Synthetics service. Unable to determine license level.',
      ],
    ])(
      'does not call api when license is expired or unavailable',
      async (isExpired, errorMessage) => {
        const { service, locations } = getMockedService();

        mockCoreStart.elasticsearch.client.asInternalUser.license.get = jest
          .fn()
          .mockResolvedValue({
            license: isExpired
              ? {
                  status: 'expired',
                  uid: 'c5788419-1c6f-424a-9217-da7a0a9151a0',
                  type: 'platinum',
                  issue_date: '2022-11-29T00:00:00.000Z',
                  issue_date_in_millis: 1669680000000,
                  expiry_date: '2022-12-31T23:59:59.999Z',
                  expiry_date_in_millis: 1735689599999,
                  max_nodes: 100,
                  max_resource_units: null,
                  issued_to: 'Elastic - INTERNAL (development environments)',
                  issuer: 'API',
                  start_date_in_millis: 1669680000000,
                }
              : undefined,
          });

        serverMock.encryptedSavedObjects = mockEncryptedSO({
          attributes: getFakePayload([locations[0]]),
        }) as any;

        (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

        await expect(service.pushConfigs()).rejects.toThrow(errorMessage);
      }
    );
  });

  describe('getSyntheticsParams', () => {
    it('returns the params for all spaces', async () => {
      const { service } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        attributes: { key: 'username', value: 'elastic' },
        namespaces: ['*'],
      }) as any;

      const params = await service.getSyntheticsParams();

      expect(params).toEqual({
        '*': {
          username: 'elastic',
        },
      });
    });

    it('returns the params for specific space', async () => {
      const { service } = getMockedService();

      const params = await service.getSyntheticsParams({ spaceId: 'default' });

      expect(params).toEqual({
        '*': {
          username: 'elastic',
        },
        default: {
          username: 'elastic',
        },
      });
    });
    it('returns the space limited params', async () => {
      const { service } = getMockedService();

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        attributes: { key: 'username', value: 'elastic' },
        namespaces: ['default'],
      }) as any;

      const params = await service.getSyntheticsParams({ spaceId: 'default' });

      expect(params).toEqual({
        default: {
          username: 'elastic',
        },
      });
    });
  });
});

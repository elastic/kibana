/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggerMock } from '@kbn/logging-mocks';
import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { SyntheticsMonitorClient } from './synthetics_monitor_client';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { SyntheticsService } from '../synthetics_service';
import times from 'lodash/times';
import {
  LocationStatus,
  MonitorFields,
  PrivateLocation,
  SyntheticsMonitorWithId,
} from '../../../common/runtime_types';
import { mockEncryptedSO } from '../utils/mocks';

describe('SyntheticsMonitorClient', () => {
  const mockEsClient = {
    search: jest.fn(),
  };
  const savedObjectsClientMock = {
    bulkUpdate: jest.fn(),
    get: jest.fn(),
  } as unknown as SavedObjectsClientContract;
  const mockRequest = {} as unknown as KibanaRequest;

  const logger = loggerMock.create();

  const serverMock: UptimeServerSetup = {
    logger,
    uptimeEsClient: mockEsClient,
    authSavedObjectsClient: {
      bulkUpdate: jest.fn(),
      get: jest.fn(),
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

  const syntheticsService = new SyntheticsService(serverMock);

  syntheticsService.addConfig = jest.fn();
  syntheticsService.editConfig = jest.fn();
  syntheticsService.deleteConfigs = jest.fn();

  const locations = times(3).map((n) => {
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

  const privateLocations: PrivateLocation[] = times(1).map((n) => {
    return {
      id: `loc-${n}`,
      label: 'Test private location',
      geo: {
        lat: 0,
        lon: 0,
      },
      isServiceManaged: false,
      agentPolicyId: `loc-${n}`,
      concurrentMonitors: 1,
    };
  });

  const monitor = {
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
  } as unknown as MonitorFields;

  it('should add a monitor', async () => {
    locations[1].isServiceManaged = false;

    const id = 'test-id-1';
    const client = new SyntheticsMonitorClient(syntheticsService, serverMock);
    client.privateLocationAPI.createMonitors = jest.fn();

    await client.addMonitors(
      [{ monitor, id }],
      mockRequest,
      savedObjectsClientMock,
      privateLocations,
      'test-space'
    );

    expect(syntheticsService.addConfig).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.createMonitors).toHaveBeenCalledTimes(1);
  });

  it('should edit a monitor', async () => {
    locations[1].isServiceManaged = false;

    const id = 'test-id-1';
    const client = new SyntheticsMonitorClient(syntheticsService, serverMock);
    client.privateLocationAPI.editMonitors = jest.fn();

    await client.editMonitors(
      [
        {
          monitor,
          id,
        },
      ],
      mockRequest,
      savedObjectsClientMock,
      privateLocations,
      'test-space'
    );

    expect(syntheticsService.editConfig).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.editMonitors).toHaveBeenCalledTimes(1);
  });

  it('should delete a monitor', async () => {
    locations[1].isServiceManaged = false;

    const client = new SyntheticsMonitorClient(syntheticsService, serverMock);
    client.privateLocationAPI.deleteMonitors = jest.fn();

    await client.deleteMonitors(
      [monitor as unknown as SyntheticsMonitorWithId],
      mockRequest,
      savedObjectsClientMock,
      'test-space'
    );

    expect(syntheticsService.deleteConfigs).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.deleteMonitors).toHaveBeenCalledTimes(1);
  });
});

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
  SyntheticsMonitorWithId,
} from '../../../common/runtime_types';

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
    client.privateLocationAPI.createMonitor = jest.fn();

    await client.addMonitor(monitor, id, mockRequest, savedObjectsClientMock);

    expect(syntheticsService.addConfig).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.createMonitor).toHaveBeenCalledTimes(1);
  });

  it('should edit a monitor', async () => {
    locations[1].isServiceManaged = false;

    const id = 'test-id-1';
    const client = new SyntheticsMonitorClient(syntheticsService, serverMock);
    client.privateLocationAPI.editMonitor = jest.fn();

    await client.editMonitor(monitor, id, mockRequest, savedObjectsClientMock);

    expect(syntheticsService.editConfig).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.editMonitor).toHaveBeenCalledTimes(1);
  });

  it('should delete a monitor', async () => {
    locations[1].isServiceManaged = false;

    const client = new SyntheticsMonitorClient(syntheticsService, serverMock);
    client.privateLocationAPI.deleteMonitor = jest.fn();

    await client.deleteMonitor(
      monitor as unknown as SyntheticsMonitorWithId,
      mockRequest,
      savedObjectsClientMock
    );

    expect(syntheticsService.deleteConfigs).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.deleteMonitor).toHaveBeenCalledTimes(1);
  });
});

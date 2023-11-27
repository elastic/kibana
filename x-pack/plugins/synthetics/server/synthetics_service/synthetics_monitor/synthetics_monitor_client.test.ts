/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggerMock } from '@kbn/logging-mocks';
import { KibanaRequest, SavedObjectsClientContract, CoreStart } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { SyntheticsMonitorClient } from './synthetics_monitor_client';
import { SyntheticsService } from '../synthetics_service';
import times from 'lodash/times';
import {
  LocationStatus,
  MonitorFields,
  SyntheticsMonitorWithId,
} from '../../../common/runtime_types';
import { mockEncryptedSO } from '../utils/mocks';
import { SyntheticsServerSetup } from '../../types';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';

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

  const serverMock: SyntheticsServerSetup = {
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
    encryptedSavedObjects: mockEncryptedSO(),
  } as unknown as SyntheticsServerSetup;

  const syntheticsService = new SyntheticsService(serverMock);

  syntheticsService.addConfigs = jest.fn();
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

  const privateLocations: PrivateLocationAttributes[] = times(1).map((n) => {
    return {
      id: `loc-${n}`,
      label: 'Test private location',
      geo: {
        lat: 0,
        lon: 0,
      },
      isServiceManaged: false,
      agentPolicyId: `loc-${n}`,
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
    secrets: '{}',
  } as unknown as MonitorFields;

  const previousMonitor: any = {
    attributes: { ...monitor },
  };

  it('should add a monitor', async () => {
    locations[1].isServiceManaged = false;

    const id = 'test-id-1';
    const client = new SyntheticsMonitorClient(syntheticsService, serverMock);
    client.privateLocationAPI.createPackagePolicies = jest.fn();

    await client.addMonitors(
      [{ monitor, id }],
      savedObjectsClientMock,
      privateLocations,
      'test-space'
    );

    expect(syntheticsService.addConfigs).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.createPackagePolicies).toHaveBeenCalledTimes(1);
  });

  it('should edit a monitor', async () => {
    locations[1].isServiceManaged = false;

    const id = 'test-id-1';
    const client = new SyntheticsMonitorClient(syntheticsService, serverMock);
    client.privateLocationAPI.editMonitors = jest.fn().mockResolvedValue({});

    await client.editMonitors(
      [
        {
          id,
          monitor,
          previousMonitor,
          decryptedPreviousMonitor: previousMonitor,
        },
      ],
      {
        request: mockRequest,
        savedObjectsClient: savedObjectsClientMock,
      } as any,
      privateLocations,
      'test-space'
    );

    expect(syntheticsService.editConfig).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.editMonitors).toHaveBeenCalledTimes(1);
  });

  it('deletes a monitor from location, if location is removed from monitor', async () => {
    locations[1].isServiceManaged = false;

    const id = 'test-id-1';
    const client = new SyntheticsMonitorClient(syntheticsService, serverMock);
    syntheticsService.editConfig = jest.fn();
    client.privateLocationAPI.editMonitors = jest.fn().mockResolvedValue({});

    monitor.locations = previousMonitor.attributes.locations.filter(
      (loc: any) => loc.id !== locations[0].id
    );

    await client.editMonitors(
      [
        {
          monitor,
          id,
          previousMonitor,
          decryptedPreviousMonitor: previousMonitor,
        },
      ],
      {
        request: mockRequest,
        savedObjectsClient: savedObjectsClientMock,
      } as any,
      privateLocations,
      'test-space'
    );

    expect(syntheticsService.editConfig).toHaveBeenCalledTimes(1);
    expect(syntheticsService.editConfig).toHaveBeenCalledWith([
      {
        monitor,
        configId: id,
        params: {
          username: 'elastic',
        },
        spaceId: 'test-space',
      },
    ]);
    expect(syntheticsService.deleteConfigs).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.editMonitors).toHaveBeenCalledTimes(1);
  });

  it('should delete a monitor', async () => {
    locations[1].isServiceManaged = false;

    const client = new SyntheticsMonitorClient(syntheticsService, serverMock);
    client.privateLocationAPI.deleteMonitors = jest.fn();
    syntheticsService.deleteConfigs = jest.fn();

    await client.deleteMonitors(
      [monitor as unknown as SyntheticsMonitorWithId],
      savedObjectsClientMock,
      'test-space'
    );

    expect(syntheticsService.deleteConfigs).toHaveBeenCalledTimes(1);
    expect(client.privateLocationAPI.deleteMonitors).toHaveBeenCalledTimes(1);
  });
});

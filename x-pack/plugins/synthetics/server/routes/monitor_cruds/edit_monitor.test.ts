/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { syncEditedMonitor } from './edit_monitor';
import { SavedObject, SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import {
  EncryptedSyntheticsMonitor,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { mockEncryptedSO } from '../../synthetics_service/utils/mocks';

jest.mock('../telemetry/monitor_upgrade_sender', () => ({
  sendTelemetryEvents: jest.fn(),
  formatTelemetryUpdateEvent: jest.fn(),
}));

describe('syncEditedMonitor', () => {
  const logger = loggerMock.create();

  const serverMock: UptimeServerSetup = {
    uptimeEsClient: { search: jest.fn() },
    stackVersion: null,
    authSavedObjectsClient: {
      bulkUpdate: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    },
    logger,
    config: {
      service: {
        username: 'dev',
        password: '12345',
      },
    },
    fleet: {
      authz: {
        fromRequest: jest
          .fn()
          .mockReturnValue({ integrations: { writeIntegrationPolicies: true } }),
      },
      packagePolicyService: {
        get: jest.fn().mockReturnValue({}),
        getByIDs: jest.fn().mockReturnValue([]),
        buildPackagePolicyFromPackage: jest.fn().mockReturnValue({}),
      },
    },
    encryptedSavedObjects: mockEncryptedSO,
  } as unknown as UptimeServerSetup;

  const editedMonitor = {
    type: 'http',
    enabled: true,
    schedule: {
      number: '3',
      unit: 'm',
    },
    name: 'my mon',
    locations: [
      {
        id: 'test_location',
        isServiceManaged: true,
      },
    ],
    urls: 'http://google.com',
    max_redirects: '0',
    password: '',
    proxy_url: '',
    id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
    fields: { config_id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d' },
    fields_under_root: true,
  } as unknown as SyntheticsMonitor;

  const previousMonitor = {
    id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
    attributes: { name: editedMonitor.name, locations: [] } as any,
    type: 'synthetics-monitor',
    references: [],
  } as SavedObject<EncryptedSyntheticsMonitor>;

  const syntheticsService = new SyntheticsService(serverMock);

  const syntheticsMonitorClient = new SyntheticsMonitorClient(syntheticsService, serverMock);

  syntheticsService.editConfig = jest.fn();

  it('includes the isEdit flag', async () => {
    await syncEditedMonitor({
      normalizedMonitor: editedMonitor,
      previousMonitor,
      decryptedPreviousMonitor:
        previousMonitor as unknown as SavedObject<SyntheticsMonitorWithSecrets>,
      syntheticsMonitorClient,
      server: serverMock,
      request: {} as unknown as KibanaRequest,
      savedObjectsClient:
        serverMock.authSavedObjectsClient as unknown as SavedObjectsClientContract,
      spaceId: 'test-space',
    });

    expect(syntheticsService.editConfig).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
        }),
      ])
    );

    expect(serverMock.authSavedObjectsClient?.update).toHaveBeenCalledWith(
      'synthetics-monitor',
      '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
      expect.objectContaining({
        enabled: true,
      })
    );
  });
});

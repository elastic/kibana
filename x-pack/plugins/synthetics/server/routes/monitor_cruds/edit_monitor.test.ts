/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { syncEditedMonitor } from './edit_monitor';
import { SavedObjectsUpdateResponse, SavedObject } from '@kbn/core/server';
import { EncryptedSyntheticsMonitor, SyntheticsMonitor } from '../../../common/runtime_types';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

jest.mock('../telemetry/monitor_upgrade_sender', () => ({
  sendTelemetryEvents: jest.fn(),
  formatTelemetryUpdateEvent: jest.fn(),
}));

describe('syncEditedMonitor', () => {
  const logger = loggerMock.create();

  const serverMock: UptimeServerSetup = {
    uptimeEsClient: { search: jest.fn() },
    kibanaVersion: null,
    authSavedObjectsClient: { bulkUpdate: jest.fn() },
    logger,
    config: {
      service: {
        username: 'dev',
        password: '12345',
      },
    },
  } as unknown as UptimeServerSetup;

  const syntheticsService = new SyntheticsService(serverMock);

  const fakePush = jest.fn();

  jest.spyOn(syntheticsService, 'editConfig').mockImplementationOnce(fakePush);

  const editedMonitor = {
    type: 'http',
    enabled: true,
    schedule: {
      number: '3',
      unit: 'm',
    },
    name: 'my mon',
    locations: [],
    urls: 'http://google.com',
    max_redirects: '0',
    password: '',
    proxy_url: '',
    id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
    fields: { config_id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d' },
    fields_under_root: true,
  } as unknown as SyntheticsMonitor;

  const previousMonitor = { id: 'saved-obj-id' } as SavedObject<EncryptedSyntheticsMonitor>;
  const editedMonitorSavedObject = {
    id: 'saved-obj-id',
  } as SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor>;

  const syntheticsMonitorClient = new SyntheticsMonitorClient(syntheticsService, serverMock);

  it('includes the isEdit flag', () => {
    syncEditedMonitor({
      editedMonitor,
      editedMonitorSavedObject,
      previousMonitor,
      syntheticsMonitorClient,
      server: serverMock,
    });

    expect(fakePush).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'saved-obj-id',
      })
    );
  });
});

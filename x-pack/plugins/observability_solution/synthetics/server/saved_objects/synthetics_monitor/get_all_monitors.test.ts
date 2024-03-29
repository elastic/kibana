/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processMonitors } from './get_all_monitors';
import { mockEncryptedSO } from '../../synthetics_service/utils/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import * as getLocations from '../../synthetics_service/get_all_locations';
import { SyntheticsServerSetup } from '../../types';

describe('processMonitors', () => {
  const mockEsClient = {
    search: jest.fn(),
  };
  const logger = loggerMock.create();
  const soClient = savedObjectsClientMock.create();

  const serverMock: SyntheticsServerSetup = {
    logger,
    uptimeEsClient: mockEsClient,
    authSavedObjectsClient: soClient,
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    },
    spaces: {
      spacesService: {
        getSpaceId: jest.fn().mockReturnValue('test-space'),
      },
    },
    encryptedSavedObjects: mockEncryptedSO(),
  } as unknown as SyntheticsServerSetup;

  const syntheticsService = new SyntheticsService(serverMock);

  const monitorClient = new SyntheticsMonitorClient(syntheticsService, serverMock);

  it('should return a processed data', async () => {
    const result = processMonitors(testMonitors, serverMock, soClient, monitorClient);
    expect(result).toEqual({
      allIds: [
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
        '7f796001-a795-4c0b-afdb-3ce74edea775',
        'test-project-id-default',
      ],
      disabledCount: 2,
      disabledMonitorsCount: 1,
      projectMonitorsCount: 1,
      enabledMonitorQueryIds: [
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
        '7f796001-a795-4c0b-afdb-3ce74edea775',
      ],
      disabledMonitorQueryIds: ['test-project-id-default'],
      monitorLocationIds: ['us_central_qa', 'us_central_staging', 'us_central'],
      maxPeriod: 600000,
      monitorLocationMap: {
        '7f796001-a795-4c0b-afdb-3ce74edea775': [
          'us_central_qa',
          'us_central',
          'us_central_staging',
        ],
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22': ['us_central_qa', 'us_central_staging'],
      },
      monitorQueryIdToConfigIdMap: {
        '7f796001-a795-4c0b-afdb-3ce74edea775': '7f796001-a795-4c0b-afdb-3ce74edea775',
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22': 'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
        'test-project-id-default': '5e203f47-1261-4978-a915-cc3315d90fb1',
      },
    });
  });

  it('should return a processed data where location label is missing', async () => {
    testMonitors[0].attributes.locations[0].label = undefined;

    const result = processMonitors(testMonitors, serverMock, soClient, monitorClient);
    expect(result).toEqual({
      allIds: [
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
        '7f796001-a795-4c0b-afdb-3ce74edea775',
        'test-project-id-default',
      ],
      disabledCount: 2,
      disabledMonitorsCount: 1,
      projectMonitorsCount: 1,
      enabledMonitorQueryIds: [
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
        '7f796001-a795-4c0b-afdb-3ce74edea775',
      ],
      disabledMonitorQueryIds: ['test-project-id-default'],
      monitorLocationIds: ['us_central_qa', 'us_central_staging', 'us_central'],
      maxPeriod: 600000,
      monitorLocationMap: {
        '7f796001-a795-4c0b-afdb-3ce74edea775': [
          'us_central_qa',
          'us_central',
          'us_central_staging',
        ],
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22': ['us_central_qa', 'us_central_staging'],
      },
      monitorQueryIdToConfigIdMap: {
        '7f796001-a795-4c0b-afdb-3ce74edea775': '7f796001-a795-4c0b-afdb-3ce74edea775',
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22': 'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
        'test-project-id-default': '5e203f47-1261-4978-a915-cc3315d90fb1',
      },
    });
  });

  it('should return a processed data where location label is missing but it get resolved', async () => {
    testMonitors[0].attributes.locations[0].label = undefined;

    jest.spyOn(getLocations, 'getAllLocations').mockResolvedValue(
      new Promise((r) =>
        r({
          publicLocations: [
            {
              id: 'us_central',
              label: 'North America - US Central',
              geo: { lat: 41.25, lon: -95.86 },
              url: 'https://central.dev',
              isServiceManaged: true,
              status: 'beta',
              isInvalid: false,
            },
            {
              id: 'us_central_qa',
              label: 'US Central QA',
              geo: { lat: 41.25, lon: -95.86 },
              url: 'https://qa.elstc.co',
              isServiceManaged: true,
              status: 'beta',
              isInvalid: false,
            },
            {
              id: 'us_central_staging',
              label: 'US Central Staging',
              geo: { lat: 41.25, lon: -95.86 },
              url: 'https://staging.no',
              isServiceManaged: true,
              status: 'beta',
              isInvalid: false,
            },
          ],
          privateLocations: [],
          throttling: { download: 20, upload: 10 },
        } as any)
      )
    );

    const result = processMonitors(testMonitors, serverMock, soClient, monitorClient);
    expect(result).toEqual({
      allIds: [
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
        '7f796001-a795-4c0b-afdb-3ce74edea775',
        'test-project-id-default',
      ],
      disabledCount: 2,
      disabledMonitorsCount: 1,
      projectMonitorsCount: 1,
      enabledMonitorQueryIds: [
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
        '7f796001-a795-4c0b-afdb-3ce74edea775',
      ],
      disabledMonitorQueryIds: ['test-project-id-default'],
      monitorLocationIds: ['us_central_qa', 'us_central_staging', 'us_central'],
      maxPeriod: 600000,
      monitorLocationMap: {
        '7f796001-a795-4c0b-afdb-3ce74edea775': [
          'us_central_qa',
          'us_central',
          'us_central_staging',
        ],
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22': ['us_central_qa', 'us_central_staging'],
      },
      monitorQueryIdToConfigIdMap: {
        '7f796001-a795-4c0b-afdb-3ce74edea775': '7f796001-a795-4c0b-afdb-3ce74edea775',
        'aa925d91-40b0-4f8f-b695-bb9b53cd4e22': 'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
        'test-project-id-default': '5e203f47-1261-4978-a915-cc3315d90fb1',
      },
    });
  });
});

const testMonitors: any = [
  {
    type: 'synthetics-monitor',
    id: 'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
    attributes: {
      enabled: true,
      schedule: { number: '3', unit: 'm' },
      locations: [
        { isServiceManaged: true, id: 'us_central_qa', label: 'US Central QA' },
        { isServiceManaged: true, id: 'us_central_staging', label: 'US Central Staging' },
      ],
      id: 'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
      config_id: 'aa925d91-40b0-4f8f-b695-bb9b53cd4e22',
    },
    references: [],
    migrationVersion: { 'synthetics-monitor': '8.6.0' },
    coreMigrationVersion: '8.7.0',
    updated_at: '2023-01-17T08:21:53.528Z',
    created_at: '2023-01-15T12:58:27.795Z',
    version: 'Wzk1NzYyLDFd',
    namespaces: ['default'],
    score: 0,
  },
  {
    type: 'synthetics-monitor',
    id: '7f796001-a795-4c0b-afdb-3ce74edea775',
    attributes: {
      enabled: true,
      schedule: { unit: 'm', number: '10' },
      locations: [
        { isServiceManaged: true, id: 'us_central_qa', label: 'US Central QA' },
        { isServiceManaged: true, id: 'us_central', label: 'North America - US Central' },
        { isServiceManaged: true, id: 'us_central_staging', label: 'US Central Staging' },
      ],
      id: '7f796001-a795-4c0b-afdb-3ce74edea775',
      config_id: '7f796001-a795-4c0b-afdb-3ce74edea775',
    },
    references: [],
    migrationVersion: { 'synthetics-monitor': '8.6.0' },
    coreMigrationVersion: '8.7.0',
    updated_at: '2023-01-17T09:09:21.542Z',
    created_at: '2023-01-13T22:49:59.273Z',
    version: 'Wzk3MDM0LDFd',
    namespaces: ['default'],
    score: 0,
  },
  {
    type: 'synthetics-monitor',
    id: '5e203f47-1261-4978-a915-cc3315d90fb1',
    attributes: {
      enabled: false,
      schedule: { number: '3', unit: 'm' },
      locations: [
        { id: 'us_central_qa', label: 'US Central QA', isServiceManaged: true },
        { id: 'us_central_staging', label: 'US Central Staging', isServiceManaged: true },
      ],
      id: 'test-project-id-default',
      config_id: '5e203f47-1261-4978-a915-cc3315d90fb1',
      origin: 'project',
    },
    references: [],
    migrationVersion: { 'synthetics-monitor': '8.6.0' },
    coreMigrationVersion: '8.7.0',
    updated_at: '2023-01-17T12:48:11.301Z',
    created_at: '2023-01-17T12:48:11.301Z',
    version: 'WzEwMDA5OSwxXQ==',
    namespaces: ['default'],
    score: 0,
  },
];

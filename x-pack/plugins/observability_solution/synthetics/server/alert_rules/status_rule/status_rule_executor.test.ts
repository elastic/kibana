/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { StatusRuleExecutor } from './status_rule_executor';
import { mockEncryptedSO } from '../../synthetics_service/utils/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import * as monitorUtils from '../../saved_objects/synthetics_monitor/get_all_monitors';
import * as locationsUtils from '../../synthetics_service/get_all_locations';
import type { PublicLocation } from '../../../common/runtime_types';
import { SyntheticsServerSetup } from '../../types';

describe('StatusRuleExecutor', () => {
  const mockEsClient = elasticsearchClientMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const soClient = savedObjectsClientMock.create();
  jest.spyOn(locationsUtils, 'getAllLocations').mockResolvedValue({
    // @ts-ignore
    publicLocations: [
      {
        id: 'us_central_qa',
        label: 'US Central QA',
      },
      {
        id: 'us_central_dev',
        label: 'US Central DEV',
      },
    ] as unknown as PublicLocation,
    privateLocations: [],
  });

  const serverMock: SyntheticsServerSetup = {
    logger,
    syntheticsEsClient: mockEsClient,
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

  it('should only query enabled monitors', async () => {
    const spy = jest.spyOn(monitorUtils, 'getAllMonitors').mockResolvedValue([]);
    const statusRule = new StatusRuleExecutor(
      moment().toDate(),
      {},
      soClient,
      mockEsClient,
      serverMock,
      monitorClient
    );
    const { downConfigs, staleDownConfigs } = await statusRule.getDownChecks({});

    expect(downConfigs).toEqual({});
    expect(staleDownConfigs).toEqual({});

    expect(spy).toHaveBeenCalledWith({
      filter: 'synthetics-monitor.attributes.alert.status.enabled: true',
      soClient,
    });
  });

  it('marks deleted configs as expected', async () => {
    jest.spyOn(monitorUtils, 'getAllMonitors').mockResolvedValue(testMonitors);
    const statusRule = new StatusRuleExecutor(
      moment().toDate(),
      {},
      soClient,
      mockEsClient,
      serverMock,
      monitorClient
    );

    const { downConfigs } = await statusRule.getDownChecks({});

    expect(downConfigs).toEqual({});

    const staleDownConfigs = await statusRule.markDeletedConfigs({
      id1: {
        locationId: 'us-east-1',
        configId: 'id1',
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
        monitorQueryId: 'test',
        ping: {} as any,
      },
      '2548dab3-4752-4b4d-89a2-ae3402b6fb04-us_central_dev': {
        locationId: 'us_central_dev',
        configId: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
        monitorQueryId: 'test',
        ping: {} as any,
      },
      '2548dab3-4752-4b4d-89a2-ae3402b6fb04-us_central_qa': {
        locationId: 'us_central_qa',
        configId: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
        monitorQueryId: 'test',
        ping: {} as any,
      },
    });

    expect(staleDownConfigs).toEqual({
      id1: {
        configId: 'id1',
        isDeleted: true,
        locationId: 'us-east-1',
        monitorQueryId: 'test',
        ping: {},
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
      },
      '2548dab3-4752-4b4d-89a2-ae3402b6fb04-us_central_dev': {
        configId: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
        isLocationRemoved: true,
        locationId: 'us_central_dev',
        monitorQueryId: 'test',
        ping: {},
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
      },
    });
  });

  it('does not mark deleted config when monitor does not contain location label', async () => {
    jest.spyOn(monitorUtils, 'getAllMonitors').mockResolvedValue([
      {
        ...testMonitors[0],
        attributes: {
          ...testMonitors[0].attributes,
          locations: [
            {
              geo: { lon: -95.86, lat: 41.25 },
              isServiceManaged: true,
              id: 'us_central_qa',
            },
          ],
        },
      },
    ]);
    const statusRule = new StatusRuleExecutor(
      moment().toDate(),
      {},
      soClient,
      mockEsClient,
      serverMock,
      monitorClient
    );

    const { downConfigs } = await statusRule.getDownChecks({});

    expect(downConfigs).toEqual({});

    const staleDownConfigs = await statusRule.markDeletedConfigs({
      id1: {
        locationId: 'us-east-1',
        configId: 'id1',
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
        monitorQueryId: 'test',
        ping: {} as any,
      },
      '2548dab3-4752-4b4d-89a2-ae3402b6fb04-us_central_dev': {
        locationId: 'us_central_dev',
        configId: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
        monitorQueryId: 'test',
        ping: {} as any,
      },
      '2548dab3-4752-4b4d-89a2-ae3402b6fb04-us_central_qa': {
        locationId: 'us_central_qa',
        configId: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
        monitorQueryId: 'test',
        ping: {} as any,
      },
    });

    expect(staleDownConfigs).toEqual({
      id1: {
        configId: 'id1',
        isDeleted: true,
        locationId: 'us-east-1',
        monitorQueryId: 'test',
        ping: {},
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
      },
      '2548dab3-4752-4b4d-89a2-ae3402b6fb04-us_central_dev': {
        configId: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
        isLocationRemoved: true,
        locationId: 'us_central_dev',
        monitorQueryId: 'test',
        ping: {},
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
      },
    });
  });
});

const testMonitors = [
  {
    type: 'synthetics-monitor',
    id: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
    attributes: {
      type: 'browser',
      form_monitor_type: 'multistep',
      enabled: true,
      alert: { status: { enabled: false } },
      schedule: { unit: 'm', number: '10' },
      'service.name': '',
      config_id: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
      tags: [],
      timeout: null,
      name: 'https://www.google.com',
      locations: [
        {
          geo: { lon: -95.86, lat: 41.25 },
          isServiceManaged: true,
          id: 'us_central_qa',
          label: 'US Central QA',
        },
      ],
      namespace: 'test_monitor',
      origin: 'ui',
      journey_id: '',
      hash: '',
      id: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
      project_id: '',
      playwright_options: '',
      __ui: {
        script_source: { is_generated_script: false, file_name: '' },
      },
      'url.port': null,
      playwright_text_assertion: '',
      urls: 'https://www.google.com',
      screenshots: 'on',
      'filter_journeys.match': '',
      'filter_journeys.tags': [],
      ignore_https_errors: false,
      throttling: {
        id: 'custom',
        label: 'Custom',
        value: {
          download: '5',
          upload: '3',
          latency: '20',
        },
      },
      'ssl.certificate_authorities': '',
      'ssl.certificate': '',
      'ssl.verification_mode': 'full',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
      revision: 3,
    },
    references: [],
    migrationVersion: { 'synthetics-monitor': '8.6.0' },
    coreMigrationVersion: '8.0.0',
    updated_at: '2023-02-23T21:19:21.041Z',
    created_at: '2023-02-23T21:04:19.579Z',
    version: 'WzY1MjUwLDNd',
    namespaces: ['test-monitor'],
    score: null,
    sort: ['https://www.google.com', 1889],
  },
] as any;

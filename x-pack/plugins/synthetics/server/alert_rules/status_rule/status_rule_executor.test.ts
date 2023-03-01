/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusRuleExecutor } from './status_rule_executor';
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { mockEncryptedSO } from '../../synthetics_service/utils/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import moment from 'moment';
import * as monitorUtils from '../../saved_objects/synthetics_monitor/get_all_monitors';

describe('StatusRuleExecutor', () => {
  const mockEsClient = elasticsearchClientMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const soClient = savedObjectsClientMock.create();

  const serverMock: UptimeServerSetup = {
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
    encryptedSavedObjects: mockEncryptedSO,
  } as unknown as UptimeServerSetup;

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
        location: 'us-east-1',
        configId: 'id1',
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
        monitorQueryId: 'test',
        ping: {} as any,
      },
      '2548dab3-4752-4b4d-89a2-ae3402b6fb04-us_central_dev': {
        location: 'US Central DEV',
        configId: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
        monitorQueryId: 'test',
        ping: {} as any,
      },
      '2548dab3-4752-4b4d-89a2-ae3402b6fb04-us_central_qa': {
        location: 'US Central QA',
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
        location: 'us-east-1',
        monitorQueryId: 'test',
        ping: {},
        status: 'down',
        timestamp: '2021-06-01T00:00:00.000Z',
      },
      '2548dab3-4752-4b4d-89a2-ae3402b6fb04-us_central_dev': {
        configId: '2548dab3-4752-4b4d-89a2-ae3402b6fb04',
        isLocationRemoved: true,
        location: 'US Central DEV',
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
        is_zip_url_tls_enabled: false,
      },
      'url.port': null,
      'source.zip_url.url': '',
      'source.zip_url.folder': '',
      'source.zip_url.proxy_url': '',
      playwright_text_assertion: '',
      urls: 'https://www.google.com',
      screenshots: 'on',
      'filter_journeys.match': '',
      'filter_journeys.tags': [],
      ignore_https_errors: false,
      'throttling.is_enabled': true,
      'throttling.download_speed': '5',
      'throttling.upload_speed': '3',
      'throttling.latency': '20',
      'throttling.config': '5d/3u/20l',
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { alertsClientMock } from '@kbn/rule-registry-plugin/server/alert_data_client/alerts_client.mock';
import { AlertService } from '../../services';
import type { CasesClientArgs } from '../types';
import { getAlerts } from './get';

describe('getAlerts', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.create().get('case');
  const alertsClient = alertsClientMock.create();
  let alertsService: AlertService;

  beforeEach(async () => {
    alertsService = new AlertService(esClient, logger, alertsClient);
    jest.clearAllMocks();
  });

  const docs = [
    {
      _index: '.internal.alerts-security.alerts-default-000001',
      _id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
      _version: 2,
      _seq_no: 255,
      _primary_term: 1,
      found: true,
      _source: {
        destination: { mac: 'ff:ff:ff:ff:ff:ff' },
        source: { bytes: 444, mac: '11:1f:1e:13:15:14', packets: 6 },
        ecs: { version: '8.0.0' },
      },
    },
  ];

  esClient.mget.mockResolvedValue({ docs });

  it('returns an empty array if the alert info are empty', async () => {
    const clientArgs = { services: { alertsService } } as unknown as CasesClientArgs;
    const res = await getAlerts([], clientArgs);

    expect(res).toEqual([]);
  });

  it('returns the alerts correctly', async () => {
    const clientArgs = { services: { alertsService } } as unknown as CasesClientArgs;
    const res = await getAlerts(
      [
        {
          index: '.internal.alerts-security.alerts-default-000001',
          id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        },
      ],
      clientArgs
    );

    expect(res).toEqual([
      {
        index: '.internal.alerts-security.alerts-default-000001',
        id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        destination: { mac: 'ff:ff:ff:ff:ff:ff' },
        source: { bytes: 444, mac: '11:1f:1e:13:15:14', packets: 6 },
        ecs: { version: '8.0.0' },
      },
    ]);
  });

  it('filters mget errors correctly', async () => {
    esClient.mget.mockResolvedValue({
      docs: [
        ...docs,
        {
          error: { type: 'not-found', reason: 'an error' },
          _index: '.internal.alerts-security.alerts-default-000002',
          _id: 'd3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        },
      ],
    });
    const clientArgs = { services: { alertsService } } as unknown as CasesClientArgs;

    const res = await getAlerts(
      [
        {
          index: '.internal.alerts-security.alerts-default-000001',
          id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        },
      ],
      clientArgs
    );

    expect(res).toEqual([
      {
        index: '.internal.alerts-security.alerts-default-000001',
        id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        destination: { mac: 'ff:ff:ff:ff:ff:ff' },
        source: { bytes: 444, mac: '11:1f:1e:13:15:14', packets: 6 },
        ecs: { version: '8.0.0' },
      },
    ]);
  });

  it('filters docs without _source correctly', async () => {
    esClient.mget.mockResolvedValue({
      docs: [
        ...docs,
        {
          _index: '.internal.alerts-security.alerts-default-000002',
          _id: 'd3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
          found: true,
        },
      ],
    });
    const clientArgs = { services: { alertsService } } as unknown as CasesClientArgs;

    const res = await getAlerts(
      [
        {
          index: '.internal.alerts-security.alerts-default-000001',
          id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        },
      ],
      clientArgs
    );

    expect(res).toEqual([
      {
        index: '.internal.alerts-security.alerts-default-000001',
        id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        destination: { mac: 'ff:ff:ff:ff:ff:ff' },
        source: { bytes: 444, mac: '11:1f:1e:13:15:14', packets: 6 },
        ecs: { version: '8.0.0' },
      },
    ]);
  });
});

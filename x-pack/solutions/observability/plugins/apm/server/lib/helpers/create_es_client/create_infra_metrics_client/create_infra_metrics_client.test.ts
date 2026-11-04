/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { MetricsDataPluginSetup } from '@kbn/metrics-data-access-plugin/server';
import type { APMRouteHandlerResources } from '../../../../routes/apm_routes/register_apm_server_routes';
import {
  createInfraMetricsClient,
  createInfraMetricsClientWith,
} from './create_infra_metrics_client';

const searchParams = { size: 0, track_total_hits: false, query: { match_all: {} } };

describe('createInfraMetricsClientWith', () => {
  it('resolves indices with the given saved objects client and searches with the given Elasticsearch client', async () => {
    const savedObjectsClient = { id: 'space-scoped' } as unknown as SavedObjectsClientContract;
    const esClient = { search: jest.fn().mockResolvedValue({ hits: { hits: [] } }) };
    const metricsClient = {
      getMetricIndices: jest.fn().mockResolvedValue('metrics-custom-*'),
    };

    const client = createInfraMetricsClientWith({
      metricsClient: metricsClient as unknown as MetricsDataPluginSetup['client'],
      getSavedObjectsClient: async () => savedObjectsClient,
      esClient: esClient as unknown as ElasticsearchClient,
    });

    await client.search(searchParams);

    expect(metricsClient.getMetricIndices).toHaveBeenCalledWith({ savedObjectsClient });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: ['metrics-custom-*'], ...searchParams })
    );
  });
});

describe('createInfraMetricsClient', () => {
  it('keeps using the request saved objects client', async () => {
    const savedObjectsClient = { id: 'user-scoped' };
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const getMetricIndices = jest.fn().mockResolvedValue('metrics-*');
    const resources = {
      plugins: { metricsDataAccess: { setup: { client: { getMetricIndices } } } },
      context: {
        core: Promise.resolve({
          savedObjects: { client: savedObjectsClient },
          elasticsearch: { client: { asCurrentUser: { search } } },
        }),
      },
    } as unknown as APMRouteHandlerResources;

    await createInfraMetricsClient(resources).search(searchParams);

    expect(getMetricIndices).toHaveBeenCalledWith({ savedObjectsClient });
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ index: ['metrics-*'] }));
  });
});

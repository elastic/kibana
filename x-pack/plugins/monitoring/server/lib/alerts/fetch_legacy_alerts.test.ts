/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchLegacyAlerts } from './fetch_legacy_alerts';

describe('fetchLegacyAlerts', () => {
  let callCluster = jest.fn();
  const clusters = [
    {
      clusterUuid: 'abc123',
      clusterName: 'test',
    },
  ];
  const index = '.monitoring-es-*';
  const size = 10;

  it('fetch legacy alerts', async () => {
    const prefix = 'thePrefix';
    const message = 'theMessage';
    const nodes = {};
    const metadata = {
      severity: 2000,
      cluster_uuid: clusters[0].clusterUuid,
      metadata: {},
    };
    callCluster = jest.fn().mockImplementation(() => {
      return {
        hits: {
          hits: [
            {
              _source: {
                prefix,
                message,
                nodes,
                metadata,
              },
            },
          ],
        },
      };
    });
    const result = await fetchLegacyAlerts(callCluster, clusters, index, 'myWatch', size);
    expect(result).toEqual([
      {
        message,
        metadata,
        nodes,
        prefix,
      },
    ]);
  });

  it('should use consistent params', async () => {
    let params = null;
    callCluster = jest.fn().mockImplementation((...args) => {
      params = args[1];
    });
    await fetchLegacyAlerts(callCluster, clusters, index, 'myWatch', size);
    expect(params).toStrictEqual({
      index,
      filterPath: [
        'hits.hits._source.prefix',
        'hits.hits._source.message',
        'hits.hits._source.resolved_timestamp',
        'hits.hits._source.nodes',
        'hits.hits._source.metadata.*',
      ],
      body: {
        size,
        sort: [{ timestamp: { order: 'desc' } }],
        query: {
          bool: {
            minimum_should_match: 1,
            filter: [
              {
                terms: { 'metadata.cluster_uuid': clusters.map((cluster) => cluster.clusterUuid) },
              },
              { term: { 'metadata.watch': 'myWatch' } },
            ],
            should: [
              { range: { timestamp: { gte: 'now-2m' } } },
              { range: { resolved_timestamp: { gte: 'now-2m' } } },
              { bool: { must_not: { exists: { field: 'resolved_timestamp' } } } },
            ],
          },
        },
        collapse: { field: 'metadata.cluster_uuid' },
      },
    });
  });
});

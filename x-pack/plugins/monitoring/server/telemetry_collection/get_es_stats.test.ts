/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import sinon from 'sinon';
import {
  fetchElasticsearchStats,
  getElasticsearchStats,
  handleElasticsearchStats,
} from './get_es_stats';

describe('get_es_stats', () => {
  const searchMock = sinon.stub();
  const client = { search: searchMock } as unknown as ElasticsearchClient;
  const body = {
    hits: {
      hits: [
        { _id: 'abc', _source: { cluster_uuid: 'abc' } },
        { _id: 'xyz', _source: { cluster_uuid: 'xyz' } },
        { _id: '123', _source: { cluster_uuid: '123' } },
      ],
    },
  };
  const expectedClusters = body.hits.hits.map((hit) => hit._source);
  const clusterUuids = expectedClusters.map((cluster) => cluster.cluster_uuid);
  const maxBucketSize = 1;
  const start = '2022-03-09T00:00:00.000Z';
  const end = '2022-03-09T00:20:00.000Z';

  describe('getElasticsearchStats', () => {
    it('returns clusters', async () => {
      searchMock.returns(Promise.resolve(body));

      expect(
        await getElasticsearchStats(client, clusterUuids, start, end, maxBucketSize)
      ).toStrictEqual(expectedClusters);
    });
  });

  describe('fetchElasticsearchStats', () => {
    it('searches for clusters', async () => {
      searchMock.returns(body);

      expect(
        await fetchElasticsearchStats(client, clusterUuids, start, end, maxBucketSize)
      ).toStrictEqual(body);
    });
  });

  describe('handleElasticsearchStats', () => {
    // filter_path makes it easy to ignore anything unexpected because it will come back empty
    it('handles unexpected response', () => {
      const clusters = handleElasticsearchStats({} as any);

      expect(clusters.length).toStrictEqual(0);
    });

    it('handles valid response', () => {
      const clusters = handleElasticsearchStats(body as any);

      expect(clusters).toStrictEqual(expectedClusters);
    });

    it('handles no hits response', () => {
      const clusters = handleElasticsearchStats({ hits: { hits: [] } } as any);

      expect(clusters.length).toStrictEqual(0);
    });
  });
});

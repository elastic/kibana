/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import sinon from 'sinon';
import { getLicenses, handleLicenses, fetchLicenses } from './get_licenses';

describe('get_licenses', () => {
  const searchMock = sinon.stub();
  const timestamp = 1646785200000;
  const client = { search: searchMock } as unknown as ElasticsearchClient;
  const body = {
    hits: {
      hits: [
        { _id: 'abc', _source: { cluster_uuid: 'abc', license: { type: 'basic' } } },
        { _id: 'xyz', _source: { cluster_uuid: 'xyz', license: { type: 'basic' } } },
        { _id: '123', _source: { cluster_uuid: '123' } },
      ],
    },
  };
  const expectedClusters = body.hits.hits.map((hit) => hit._source);
  const clusterUuids = expectedClusters.map((cluster) => cluster.cluster_uuid);
  const expectedLicenses = {
    abc: { type: 'basic' },
    xyz: { type: 'basic' },
    '123': void 0,
  };

  describe('getLicenses', () => {
    it('returns clusters', async () => {
      searchMock.returns(Promise.resolve(body));

      expect(await getLicenses(clusterUuids, client, timestamp, 1)).toStrictEqual(expectedLicenses);
    });
  });

  describe('fetchLicenses', () => {
    it('searches for clusters', async () => {
      searchMock.returns(body);

      expect(await fetchLicenses(client, clusterUuids, timestamp, 1)).toStrictEqual(body);
    });
  });

  describe('handleLicenses', () => {
    // filter_path makes it easy to ignore anything unexpected because it will come back empty
    it('handles unexpected response', () => {
      const clusters = handleLicenses({} as any);

      expect(clusters).toStrictEqual({});
    });

    it('handles valid response', () => {
      const clusters = handleLicenses(body as any);

      expect(clusters).toStrictEqual(expectedLicenses);
    });

    it('handles no hits response', () => {
      const clusters = handleLicenses({ hits: { hits: [] } } as any);

      expect(clusters).toStrictEqual({});
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { getLicenses, handleLicenses, fetchLicenses } from './get_licenses';

describe('get_licenses', () => {
  const callWith = sinon.stub();
  const response = {
    hits: {
      hits: [
        { _id: 'abc', _source: { cluster_uuid: 'abc', license: { type: 'basic' } } },
        { _id: 'xyz', _source: { cluster_uuid: 'xyz', license: { type: 'basic' } } },
        { _id: '123', _source: { cluster_uuid: '123' } },
      ],
    },
  };
  const expectedClusters = response.hits.hits.map((hit) => hit._source);
  const clusterUuids = expectedClusters.map((cluster) => ({ clusterUuid: cluster.cluster_uuid }));
  const expectedLicenses = {
    abc: { type: 'basic' },
    xyz: { type: 'basic' },
    '123': void 0,
  };

  describe('getLicenses', () => {
    it('returns clusters', async () => {
      callWith.withArgs('search').returns(Promise.resolve(response));

      expect(
        await getLicenses(
          clusterUuids,
          { callCluster: callWith } as any,
          { maxBucketSize: 1 } as any
        )
      ).toStrictEqual(expectedLicenses);
    });
  });

  describe('fetchLicenses', () => {
    it('searches for clusters', async () => {
      callWith.returns(response);

      expect(
        await fetchLicenses(
          callWith,
          clusterUuids.map(({ clusterUuid }) => clusterUuid),
          { maxBucketSize: 1 } as any
        )
      ).toStrictEqual(response);
    });
  });

  describe('handleLicenses', () => {
    // filterPath makes it easy to ignore anything unexpected because it will come back empty
    it('handles unexpected response', () => {
      const clusters = handleLicenses({} as any);

      expect(clusters).toStrictEqual({});
    });

    it('handles valid response', () => {
      const clusters = handleLicenses(response as any);

      expect(clusters).toStrictEqual(expectedLicenses);
    });

    it('handles no hits response', () => {
      const clusters = handleLicenses({ hits: { hits: [] } } as any);

      expect(clusters).toStrictEqual({});
    });
  });
});

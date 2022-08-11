/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import sinon from 'sinon';
import {
  fetchHighLevelStats,
  getHighLevelStats,
  handleHighLevelStatsResponse,
} from './get_high_level_stats';

describe('get_high_level_stats', () => {
  const searchMock = sinon.stub();
  const callCluster = { search: searchMock } as unknown as ElasticsearchClient;
  const product = 'xyz';
  const cloudName = 'bare-metal';
  const start = new Date().toISOString();
  const end = new Date().toISOString();
  const body = {
    hits: {
      hits: [
        {
          _source: {
            cluster_uuid: 'a',
            [`${product}_stats`]: {
              [`${product}`]: {
                version: '1.2.3-alpha1',
              },
              os: {
                platform: 'linux',
                platformRelease: 'linux-4.0',
                distro: 'Ubuntu Linux',
                distroRelease: 'Ubuntu Linux-14.04',
              },
            },
          },
        },
        {
          _source: {
            cluster_uuid: 'a',
            [`${product}_stats`]: {
              [`${product}`]: {
                version: '1.2.3-alpha1',
              },
              os: {
                platform: 'linux',
                platformRelease: 'linux-4.0',
                distro: 'Ubuntu Linux',
                distroRelease: 'Ubuntu Linux-14.04',
              },
            },
          },
        },
        {
          _source: {
            cluster_uuid: 'b',
            [`${product}_stats`]: {
              [`${product}`]: {
                version: '2.3.4-rc1',
              },
              os: {
                platform: 'linux',
                platformRelease: 'linux-4.0',
                distro: 'Ubuntu Linux',
                distroRelease: 'Ubuntu Linux-14.04',
              },
            },
          },
        },
        {
          _source: {
            cluster_uuid: 'b',
            [`${product}_stats`]: {
              [`${product}`]: {
                version: '2.3.4',
              },
              os: {
                platform: 'darwin',
                platformRelease: 'darwin-18.0',
              },
            },
          },
        },
        // no version or os
        {
          _source: {
            cluster_uuid: 'b',
          },
        },
        // provides cloud data
        {
          _source: {
            cluster_uuid: 'c',
            [`${product}_stats`]: {
              [`${product}`]: {
                version: '5.6.1',
              },
              cloud: {
                name: cloudName,
                id: '123',
                vm_type: 'x1',
                region: 'abc-123',
              },
            },
          },
        },
        {
          _source: {
            cluster_uuid: 'c',
            [`${product}_stats`]: {
              [`${product}`]: {
                version: '5.6.1',
              },
              cloud: {
                name: cloudName,
                id: '234',
                vm_type: 'ps4',
                region: 'def-123',
                zone: 'def-123-A',
              },
            },
          },
        },
        // same cloud instance as above (based on its ID)
        {
          _source: {
            cluster_uuid: 'c',
            [`${product}_stats`]: {
              [`${product}`]: {
                version: '5.6.1',
              },
              cloud: {
                name: cloudName,
                id: '234',
                vm_type: 'ps4',
                region: 'def-123',
                zone: 'def-123-A',
              },
            },
          },
        },
        // cloud instance without anything other than the name
        {
          _source: {
            cluster_uuid: 'c',
            [`${product}_stats`]: {
              [`${product}`]: {
                version: '5.6.1',
              },
              cloud: {
                name: cloudName,
              },
            },
          },
        },
        // no cluster_uuid (not counted)
        {
          _source: {
            [`${product}_stats`]: {
              [`${product}`]: {
                version: '2.3.4',
              },
            },
          },
        },
      ],
    },
  };
  const expectedClusters = {
    a: {
      count: 2,
      versions: [{ version: '1.2.3-alpha1', count: 2 }],
      os: {
        platforms: [{ platform: 'linux', count: 2 }],
        platformReleases: [{ platformRelease: 'linux-4.0', count: 2 }],
        distros: [{ distro: 'Ubuntu Linux', count: 2 }],
        distroReleases: [{ distroRelease: 'Ubuntu Linux-14.04', count: 2 }],
      },
      cloud: undefined,
    },
    b: {
      count: 3,
      versions: [
        { version: '2.3.4-rc1', count: 1 },
        { version: '2.3.4', count: 1 },
      ],
      os: {
        platformReleases: [
          { platformRelease: 'linux-4.0', count: 1 },
          { platformRelease: 'darwin-18.0', count: 1 },
        ],
        platforms: [
          { platform: 'linux', count: 1 },
          { platform: 'darwin', count: 1 },
        ],
        distros: [{ distro: 'Ubuntu Linux', count: 1 }],
        distroReleases: [{ distroRelease: 'Ubuntu Linux-14.04', count: 1 }],
      },
      cloud: undefined,
    },
    c: {
      count: 4,
      versions: [{ version: '5.6.1', count: 4 }],
      os: {
        platforms: [],
        platformReleases: [],
        distros: [],
        distroReleases: [],
      },
      cloud: [
        {
          name: cloudName,
          count: 4,
          vms: 2,
          vm_types: [
            { vm_type: 'x1', count: 1 },
            { vm_type: 'ps4', count: 2 },
          ],
          regions: [
            { region: 'abc-123', count: 1 },
            { region: 'def-123', count: 2 },
          ],
          zones: [{ zone: 'def-123-A', count: 2 }],
        },
      ],
    },
  };
  const clusterUuids = Object.keys(expectedClusters);
  const maxBucketSize = 10;

  describe('getHighLevelStats', () => {
    it('returns clusters', async () => {
      searchMock.returns(Promise.resolve(body));

      expect(
        await getHighLevelStats(callCluster, clusterUuids, start, end, product, maxBucketSize)
      ).toStrictEqual(expectedClusters);
    });
  });

  describe('fetchHighLevelStats', () => {
    it('searches for clusters', async () => {
      searchMock.returns(Promise.resolve(body));

      expect(
        await fetchHighLevelStats(callCluster, clusterUuids, start, end, product, maxBucketSize)
      ).toStrictEqual(body);
    });
  });

  describe('handleHighLevelStatsResponse', () => {
    // filter_path makes it easy to ignore anything unexpected because it will come back empty
    it('handles unexpected response', () => {
      const clusters = handleHighLevelStatsResponse({} as any, product);

      expect(clusters).toStrictEqual({});
    });

    it('handles valid response', () => {
      const clusters = handleHighLevelStatsResponse(body as any, product);

      expect(clusters).toStrictEqual(expectedClusters);
    });

    it('handles no hits response', () => {
      const clusters = handleHighLevelStatsResponse({ hits: { hits: [] } } as any, product);

      expect(clusters).toStrictEqual({});
    });
  });
});

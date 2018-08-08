/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';

import { mockGetClusterInfo } from './get_cluster_info';
import { mockGetClusterStats } from './get_cluster_stats';
import { mockGetXPack } from './get_xpack';

import { omit } from 'lodash';
import {
  getLocalStats,
  getLocalStatsWithCaller,
  handleLocalStats,
} from '../get_local_stats';

function mockGetLocalStats(callCluster, clusterInfo, clusterStats, license, usage) {
  mockGetClusterInfo(callCluster, clusterInfo);
  mockGetClusterStats(callCluster, clusterStats);
  mockGetXPack(callCluster, license, usage);
}

function dropTimestamp(localStats) {
  return omit(localStats, 'timestamp');
}

describe('get_local_stats', () => {

  const clusterUuid = 'abc123';
  const clusterName = 'my-cool-cluster';
  const version = '2.3.4';
  const clusterInfo = {
    cluster_uuid: clusterUuid,
    cluster_name: clusterName,
    version: {
      number: version
    }
  };
  const clusterStats = {
    _nodes: { failed: 123 },
    cluster_name: 'real-cool',
    indices: { totally: 456 },
    nodes: { yup: 'abc' },
    random: 123
  };
  const license = {
    fancy: 'license'
  };
  const usage = {
    also: 'fancy'
  };
  const xpack = {
    license,
    stack_stats: {
      xpack: usage
    }
  };
  const localStats = {
    collection: 'local',
    cluster_uuid: clusterUuid,
    cluster_name: clusterName,
    version,
    cluster_stats: omit(clusterStats, '_nodes', 'cluster_name'),
    ...xpack
  };
  const noXpackLocalStats = omit(localStats, 'license', 'stack_stats');

  describe('handleLocalStats', () => {

    it('returns expected object without xpack data', () => {
      expect(dropTimestamp(handleLocalStats(clusterInfo, clusterStats))).to.eql(noXpackLocalStats);
      expect(dropTimestamp(handleLocalStats(clusterInfo, clusterStats, { }))).to.eql(noXpackLocalStats);
    });

    it('returns expected object with xpack data', () => {
      expect(dropTimestamp(handleLocalStats(clusterInfo, clusterStats, xpack))).to.eql(localStats);
    });

  });

  describe('getLocalStatsWithCaller', () => {

    it('returns expected object without xpack data when X-Pack fails to respond', async () => {
      const callClusterUsageFailed = sinon.stub();
      const callClusterLicenseFailed = sinon.stub();
      const callClusterBothFailed = sinon.stub();

      mockGetLocalStats(
        callClusterUsageFailed,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license), Promise.reject('usage failed')
      );

      mockGetLocalStats(
        callClusterLicenseFailed,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.reject('license failed'), Promise.resolve(usage)
      );

      mockGetLocalStats(
        callClusterBothFailed,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.reject('license failed'), Promise.reject('usage failed')
      );

      expect(dropTimestamp(await getLocalStatsWithCaller(callClusterUsageFailed))).to.eql(noXpackLocalStats);
      expect(dropTimestamp(await getLocalStatsWithCaller(callClusterLicenseFailed))).to.eql(noXpackLocalStats);
      expect(dropTimestamp(await getLocalStatsWithCaller(callClusterBothFailed))).to.eql(noXpackLocalStats);
    });

    it('returns expected object with xpack data', async () => {
      const callCluster = sinon.stub();

      mockGetLocalStats(
        callCluster,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license), Promise.resolve(usage)
      );

      expect(dropTimestamp(await getLocalStatsWithCaller(callCluster))).to.eql(localStats);
    });

  });

  describe('getLocalStats', () => {

    it('uses callWithInternalUser from data cluster', async () => {
      const getCluster = sinon.stub();
      const req = {
        server: {
          plugins: {
            elasticsearch: {
              getCluster
            }
          }
        }
      };
      const callWithInternalUser = sinon.stub();

      getCluster.withArgs('data').returns({ callWithInternalUser });

      mockGetLocalStats(
        callWithInternalUser,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license), Promise.resolve(usage)
      );

      expect(dropTimestamp(await getLocalStats(req))).to.eql(localStats);
    });

  });

});

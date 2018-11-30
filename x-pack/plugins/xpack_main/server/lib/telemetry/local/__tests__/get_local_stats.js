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

const getMockServer = (getCluster = sinon.stub(), kibanaUsage = {}) => ({
  usage: { collectorSet: { bulkFetch: () => kibanaUsage, toObject: data => data } },
  plugins: {
    xpack_main: { status: { plugin: { kbnServer: { version: '8675309-snapshot' } } } },
    elasticsearch: { getCluster },
  },
});

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
  const license = { fancy: 'license' };
  const xpack = { also: 'fancy' };
  const kibana = { is: 'nice' };
  const localStats = {
    collection: 'local',
    cluster_uuid: clusterUuid,
    cluster_name: clusterName,
    license: {
      fancy: 'license'
    },
    version,
    cluster_stats: omit(clusterStats, '_nodes', 'cluster_name'),
    stack_stats: {
      kibana: { is: 'nice' },
      xpack: { also: 'fancy' },
    }
  };

  describe('handleLocalStats', () => {
    it('returns expected object without xpack and kibana data', () => {
      const result = handleLocalStats(clusterInfo, clusterStats);
      expect(result.cluster_uuid).to.eql(localStats.cluster_uuid);
      expect(result.cluster_name).to.eql(localStats.cluster_name);
      expect(result.cluster_stats).to.eql(localStats.cluster_stats);
      expect(result.version).to.be('2.3.4');
      expect(result.collection).to.be('local');
      expect(result.license).to.be(undefined);
      expect(result.stack_stats).to.be(undefined);
    });

    it('returns expected object with xpack and kibana data', () => {
      expect(dropTimestamp(handleLocalStats(clusterInfo, clusterStats, license, xpack, kibana))).to.eql(localStats);
    });
  });

  describe('getLocalStatsWithCaller', () => {
    it('returns expected object without xpack data when X-Pack fails to respond', async () => {
      const callClusterUsageFailed = sinon.stub();

      mockGetLocalStats(
        callClusterUsageFailed,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license),
        Promise.reject('usage failed')
      );

      const result = await getLocalStatsWithCaller(getMockServer(), callClusterUsageFailed);
      expect(result.cluster_uuid).to.eql(localStats.cluster_uuid);
      expect(result.cluster_name).to.eql(localStats.cluster_name);
      expect(result.cluster_stats).to.eql(localStats.cluster_stats);
      expect(result.version).to.be('2.3.4');
      expect(result.collection).to.be('local');

      // license and xpack usage info come from the same cluster call
      expect(result.license).to.be(undefined);
      expect(result.stack_stats.xpack).to.be(undefined);

      expect(result.stack_stats.kibana).to.be.an('object');
    });

    it('returns expected object with xpack data', async () => {
      const callCluster = sinon.stub();

      mockGetLocalStats(
        callCluster,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license),
        Promise.resolve(xpack)
      );

      const result = await getLocalStatsWithCaller(getMockServer(), callCluster);
      expect(result.stack_stats.xpack).to.eql(localStats.stack_stats.xpack);
    });
  });

  describe('getLocalStats', () => {
    it('uses callWithInternalUser from data cluster', async () => {
      const getCluster = sinon.stub();
      const req = { server: getMockServer(getCluster) };
      const callWithInternalUser = sinon.stub();

      getCluster.withArgs('data').returns({ callWithInternalUser });

      mockGetLocalStats(
        callWithInternalUser,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats),
        Promise.resolve(license),
        Promise.resolve(xpack)
      );

      const result = await getLocalStats(req);
      expect(result.cluster_uuid).to.eql(localStats.cluster_uuid);
      expect(result.cluster_name).to.eql(localStats.cluster_name);
      expect(result.version).to.eql(localStats.version);
      expect(result.cluster_stats).to.eql(localStats.cluster_stats);
    });
  });
});

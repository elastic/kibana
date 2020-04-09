/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { getCollectionStatus } from '..';
import { getIndexPatterns } from '../../../cluster/get_index_patterns';

const liveClusterUuid = 'a12';
const mockReq = (searchResult = {}, securityEnabled = true, userHasPermissions = true) => {
  return {
    server: {
      newPlatform: {
        setup: {
          plugins: {
            usageCollection: {
              getCollectorByType: () => ({
                isReady: () => false,
              }),
            },
          },
        },
      },
      config() {
        return {
          get: sinon
            .stub()
            .withArgs('server.uuid')
            .returns('kibana-1234'),
        };
      },
      usage: {
        collectorSet: {
          getCollectorByType: () => ({
            isReady: () => false,
          }),
        },
      },
      plugins: {
        xpack_main: {
          info: {
            isAvailable: () => true,
            feature: () => ({
              isEnabled: () => securityEnabled,
            }),
          },
        },
        elasticsearch: {
          getCluster() {
            return {
              callWithRequest(_req, type, params) {
                if (
                  type === 'transport.request' &&
                  params &&
                  params.path === '/_cluster/state/cluster_uuid'
                ) {
                  return Promise.resolve({ cluster_uuid: liveClusterUuid });
                }
                if (
                  type === 'transport.request' &&
                  params &&
                  params.path === '/_security/user/_has_privileges'
                ) {
                  return Promise.resolve({ has_all_requested: userHasPermissions });
                }
                if (type === 'transport.request' && params && params.path === '/_nodes') {
                  return Promise.resolve({ nodes: {} });
                }
                if (type === 'cat.indices') {
                  return Promise.resolve([1]);
                }
                return Promise.resolve(searchResult);
              },
            };
          },
        },
      },
    },
  };
};

describe('getCollectionStatus', () => {
  it('should handle all stack products with internal monitoring', async () => {
    const req = mockReq({
      aggregations: {
        indices: {
          buckets: [
            {
              key: '.monitoring-es-7-2019',
              es_uuids: { buckets: [{ key: 'es_1' }] },
            },
            {
              key: '.monitoring-kibana-7-2019',
              kibana_uuids: { buckets: [{ key: 'kibana_1' }] },
            },
            {
              key: '.monitoring-beats-7-2019',
              beats_uuids: {
                buckets: [
                  { key: 'apm_1', beat_type: { buckets: [{ key: 'apm-server' }] } },
                  { key: 'beats_1' },
                ],
              },
            },
            {
              key: '.monitoring-logstash-7-2019',
              logstash_uuids: { buckets: [{ key: 'logstash_1' }] },
            },
          ],
        },
      },
    });

    const result = await getCollectionStatus(req, getIndexPatterns(req.server));

    expect(result.kibana.totalUniqueInstanceCount).to.be(1);
    expect(result.kibana.totalUniqueFullyMigratedCount).to.be(0);
    expect(result.kibana.byUuid.kibana_1.isInternalCollector).to.be(true);

    expect(result.beats.totalUniqueInstanceCount).to.be(1);
    expect(result.beats.totalUniqueFullyMigratedCount).to.be(0);
    expect(result.beats.byUuid.beats_1.isInternalCollector).to.be(true);

    expect(result.apm.totalUniqueInstanceCount).to.be(1);
    expect(result.apm.totalUniqueFullyMigratedCount).to.be(0);
    expect(result.apm.byUuid.apm_1.isInternalCollector).to.be(true);

    expect(result.logstash.totalUniqueInstanceCount).to.be(1);
    expect(result.logstash.totalUniqueFullyMigratedCount).to.be(0);
    expect(result.logstash.byUuid.logstash_1.isInternalCollector).to.be(true);

    expect(result.elasticsearch.totalUniqueInstanceCount).to.be(1);
    expect(result.elasticsearch.totalUniqueFullyMigratedCount).to.be(0);
    expect(result.elasticsearch.byUuid.es_1.isInternalCollector).to.be(true);
  });

  it('should handle some stack products as fully migrated', async () => {
    const req = mockReq({
      aggregations: {
        indices: {
          buckets: [
            {
              key: '.monitoring-es-7-mb-2019',
              es_uuids: { buckets: [{ key: 'es_1' }] },
            },
            {
              key: '.monitoring-kibana-7-mb-2019',
              kibana_uuids: { buckets: [{ key: 'kibana_1' }] },
            },
            {
              key: '.monitoring-beats-7-2019',
              beats_uuids: { buckets: [{ key: 'beats_1' }] },
            },
            {
              key: '.monitoring-logstash-7-2019',
              logstash_uuids: { buckets: [{ key: 'logstash_1' }] },
            },
          ],
        },
      },
    });

    const result = await getCollectionStatus(req, getIndexPatterns(req.server));

    expect(result.kibana.totalUniqueInstanceCount).to.be(1);
    expect(result.kibana.totalUniqueFullyMigratedCount).to.be(1);
    expect(result.kibana.byUuid.kibana_1.isFullyMigrated).to.be(true);

    expect(result.beats.totalUniqueInstanceCount).to.be(1);
    expect(result.beats.totalUniqueFullyMigratedCount).to.be(0);
    expect(result.beats.byUuid.beats_1.isInternalCollector).to.be(true);

    expect(result.logstash.totalUniqueInstanceCount).to.be(1);
    expect(result.logstash.totalUniqueFullyMigratedCount).to.be(0);
    expect(result.logstash.byUuid.logstash_1.isInternalCollector).to.be(true);

    expect(result.elasticsearch.totalUniqueInstanceCount).to.be(1);
    expect(result.elasticsearch.totalUniqueFullyMigratedCount).to.be(1);
    expect(result.elasticsearch.byUuid.es_1.isFullyMigrated).to.be(true);
  });

  it('should handle some stack products as partially migrated', async () => {
    const req = mockReq({
      aggregations: {
        indices: {
          buckets: [
            {
              key: '.monitoring-es-7-mb-2019',
              es_uuids: { buckets: [{ key: 'es_1' }] },
            },
            {
              key: '.monitoring-kibana-7-mb-2019',
              kibana_uuids: { buckets: [{ key: 'kibana_1' }, { key: 'kibana_2' }] },
            },
            {
              key: '.monitoring-kibana-7-2019',
              kibana_uuids: { buckets: [{ key: 'kibana_1', by_timestamp: { value: 12 } }] },
            },
            {
              key: '.monitoring-beats-7-2019',
              beats_uuids: { buckets: [{ key: 'beats_1' }] },
            },
            {
              key: '.monitoring-logstash-7-2019',
              logstash_uuids: { buckets: [{ key: 'logstash_1' }] },
            },
          ],
        },
      },
    });

    const result = await getCollectionStatus(req, getIndexPatterns(req.server));

    expect(result.kibana.totalUniqueInstanceCount).to.be(2);
    expect(result.kibana.totalUniqueFullyMigratedCount).to.be(1);
    expect(result.kibana.byUuid.kibana_1.isPartiallyMigrated).to.be(true);
    expect(result.kibana.byUuid.kibana_1.lastInternallyCollectedTimestamp).to.be(12);

    expect(result.beats.totalUniqueInstanceCount).to.be(1);
    expect(result.beats.totalUniqueFullyMigratedCount).to.be(0);
    expect(result.beats.byUuid.beats_1.isInternalCollector).to.be(true);

    expect(result.logstash.totalUniqueInstanceCount).to.be(1);
    expect(result.logstash.totalUniqueFullyMigratedCount).to.be(0);
    expect(result.logstash.byUuid.logstash_1.isInternalCollector).to.be(true);

    expect(result.elasticsearch.totalUniqueInstanceCount).to.be(1);
    expect(result.elasticsearch.totalUniqueFullyMigratedCount).to.be(1);
    expect(result.elasticsearch.byUuid.es_1.isFullyMigrated).to.be(true);
  });

  it('should detect products based on other indices', async () => {
    const req = mockReq({ hits: { total: { value: 1 } } });
    const result = await getCollectionStatus(req, getIndexPatterns(req.server), liveClusterUuid);

    expect(result.kibana.detected.doesExist).to.be(true);
    expect(result.elasticsearch.detected.doesExist).to.be(true);
    expect(result.beats.detected.mightExist).to.be(true);
    expect(result.logstash.detected.mightExist).to.be(true);
  });

  it('should work properly when security is disabled', async () => {
    const req = mockReq({ hits: { total: { value: 1 } } }, false);
    const result = await getCollectionStatus(req, getIndexPatterns(req.server), liveClusterUuid);
    expect(result.kibana.detected.doesExist).to.be(true);
  });

  it('should not work if the user does not have the necessary permissions', async () => {
    const req = mockReq({ hits: { total: { value: 1 } } }, true, false);
    const result = await getCollectionStatus(req, getIndexPatterns(req.server), liveClusterUuid);
    expect(result._meta.hasPermissions).to.be(false);
  });
});

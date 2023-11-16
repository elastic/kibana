/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { infraPluginMock } from '@kbn/infra-plugin/server/mocks';
import { logsSharedPluginMock } from '@kbn/logs-shared-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { configSchema, createConfig } from '../../../config';
import { monitoringPluginMock } from '../../../mocks';
import { LegacyRequest } from '../../../types';
import { getCollectionStatus } from './get_collection_status';

const liveClusterUuid = 'a12';
const mockReq = (
  searchResult: object = {},
  securityEnabled: boolean = true,
  userHasPermissions: boolean = true,
  securityErrorMessage: string | null = null
): LegacyRequest => {
  const usageCollectionSetup = usageCollectionPluginMock.createSetupContract();
  const licenseService = monitoringPluginMock.createLicenseServiceMock();
  licenseService.getSecurityFeature.mockReturnValue({
    isAvailable: securityEnabled,
    isEnabled: securityEnabled,
  });
  const logger = loggerMock.create();

  return {
    server: {
      instanceUuid: 'kibana-1234',
      newPlatform: {
        setup: {
          plugins: {
            usageCollection: usageCollectionSetup,
            features: featuresPluginMock.createSetup(),
            infra: infraPluginMock.createSetupContract(),
            logsShared: logsSharedPluginMock.createSetupContract(),
          },
        },
      },
      config: createConfig(configSchema.validate({ ui: { ccs: { enabled: false } } })),
      log: logger,
      route: jest.fn(),
      plugins: {
        monitoring: {
          info: {
            getLicenseService: () => licenseService,
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
                  if (securityErrorMessage !== null) {
                    return Promise.reject({
                      message: securityErrorMessage,
                    });
                  }
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
    logger,
    getLogger: () => logger,
    params: {},
    payload: {},
    query: {},
    headers: {},
    getKibanaStatsCollector: () => null,
    getUiSettingsService: () => null,
    getActionTypeRegistry: () => null,
    getRulesClient: () => null,
    getActionsClient: () => null,
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
              es_uuids: { buckets: [{ key: 'es_1', single_type: {} }] },
            },
            {
              key: '.monitoring-kibana-7-2019',
              kibana_uuids: { buckets: [{ key: 'kibana_1', single_type: {} }] },
            },
            {
              key: '.monitoring-beats-7-2019',
              beats_uuids: {
                buckets: [
                  {
                    key: 'apm_1',
                    single_type: { beat_type: { buckets: [{ key: 'apm-server' }] } },
                  },
                  { key: 'beats_1', single_type: {} },
                ],
              },
            },
            {
              key: '.monitoring-logstash-7-2019',
              logstash_uuids: { buckets: [{ key: 'logstash_1', single_type: {} }] },
            },
          ],
        },
      },
    });

    const result = await getCollectionStatus(req);

    expect(result.kibana.totalUniqueInstanceCount).toBe(1);
    expect(result.kibana.totalUniqueFullyMigratedCount).toBe(0);
    expect(result.kibana.byUuid.kibana_1.isInternalCollector).toBe(true);

    expect(result.beats.totalUniqueInstanceCount).toBe(1);
    expect(result.beats.totalUniqueFullyMigratedCount).toBe(0);
    expect(result.beats.byUuid.beats_1.isInternalCollector).toBe(true);

    expect(result.apm.totalUniqueInstanceCount).toBe(1);
    expect(result.apm.totalUniqueFullyMigratedCount).toBe(0);
    expect(result.apm.byUuid.apm_1.isInternalCollector).toBe(true);

    expect(result.logstash.totalUniqueInstanceCount).toBe(1);
    expect(result.logstash.totalUniqueFullyMigratedCount).toBe(0);
    expect(result.logstash.byUuid.logstash_1.isInternalCollector).toBe(true);

    expect(result.elasticsearch.totalUniqueInstanceCount).toBe(1);
    expect(result.elasticsearch.totalUniqueFullyMigratedCount).toBe(0);
    expect(result.elasticsearch.byUuid.es_1.isInternalCollector).toBe(true);
  });

  it('should handle some stack products as fully migrated', async () => {
    const req = mockReq({
      aggregations: {
        indices: {
          buckets: [
            {
              key: '.monitoring-es-7-mb-2019',
              es_uuids: { buckets: [{ key: 'es_1', single_type: {} }] },
            },
            {
              key: '.monitoring-kibana-7-mb-2019',
              kibana_uuids: { buckets: [{ key: 'kibana_1', single_type: {} }] },
            },
            {
              key: '.monitoring-beats-7-2019',
              beats_uuids: { buckets: [{ key: 'beats_1', single_type: {} }] },
            },
            {
              key: '.monitoring-logstash-7-2019',
              logstash_uuids: { buckets: [{ key: 'logstash_1', single_type: {} }] },
            },
          ],
        },
      },
    });

    const result = await getCollectionStatus(req);

    expect(result.kibana.totalUniqueInstanceCount).toBe(1);
    expect(result.kibana.totalUniqueFullyMigratedCount).toBe(1);
    expect(result.kibana.byUuid.kibana_1.isFullyMigrated).toBe(true);

    expect(result.beats.totalUniqueInstanceCount).toBe(1);
    expect(result.beats.totalUniqueFullyMigratedCount).toBe(0);
    expect(result.beats.byUuid.beats_1.isInternalCollector).toBe(true);

    expect(result.logstash.totalUniqueInstanceCount).toBe(1);
    expect(result.logstash.totalUniqueFullyMigratedCount).toBe(0);
    expect(result.logstash.byUuid.logstash_1.isInternalCollector).toBe(true);

    expect(result.elasticsearch.totalUniqueInstanceCount).toBe(1);
    expect(result.elasticsearch.totalUniqueFullyMigratedCount).toBe(1);
    expect(result.elasticsearch.byUuid.es_1.isFullyMigrated).toBe(true);
  });

  it('should handle some stack products as partially migrated', async () => {
    const req = mockReq({
      aggregations: {
        indices: {
          buckets: [
            {
              key: '.monitoring-es-7-mb-2019',
              es_uuids: { buckets: [{ key: 'es_1', single_type: {} }] },
            },
            {
              key: '.monitoring-kibana-7-mb-2019',
              kibana_uuids: {
                buckets: [
                  { key: 'kibana_1', single_type: {} },
                  { key: 'kibana_2', single_type: {} },
                ],
              },
            },
            {
              key: '.monitoring-kibana-7-2019',
              kibana_uuids: {
                buckets: [{ key: 'kibana_1', single_type: { by_timestamp: { value: 12 } } }],
              },
            },
            {
              key: '.monitoring-beats-7-2019',
              beats_uuids: { buckets: [{ key: 'beats_1', single_type: {} }] },
            },
            {
              key: '.monitoring-logstash-7-2019',
              logstash_uuids: { buckets: [{ key: 'logstash_1', single_type: {} }] },
            },
          ],
        },
      },
    });

    const result = await getCollectionStatus(req);

    expect(result.kibana.totalUniqueInstanceCount).toBe(2);
    expect(result.kibana.totalUniqueFullyMigratedCount).toBe(1);
    expect(result.kibana.byUuid.kibana_1.isPartiallyMigrated).toBe(true);
    expect(result.kibana.byUuid.kibana_1.lastInternallyCollectedTimestamp).toBe(12);

    expect(result.beats.totalUniqueInstanceCount).toBe(1);
    expect(result.beats.totalUniqueFullyMigratedCount).toBe(0);
    expect(result.beats.byUuid.beats_1.isInternalCollector).toBe(true);

    expect(result.logstash.totalUniqueInstanceCount).toBe(1);
    expect(result.logstash.totalUniqueFullyMigratedCount).toBe(0);
    expect(result.logstash.byUuid.logstash_1.isInternalCollector).toBe(true);

    expect(result.elasticsearch.totalUniqueInstanceCount).toBe(1);
    expect(result.elasticsearch.totalUniqueFullyMigratedCount).toBe(1);
    expect(result.elasticsearch.byUuid.es_1.isFullyMigrated).toBe(true);
  });

  it('should detect products based on other indices', async () => {
    const req = mockReq({ hits: { total: { value: 1 } } });
    const result = await getCollectionStatus(req, liveClusterUuid);

    expect(result.kibana.detected.doesExist).toBe(true);
    expect(result.elasticsearch.detected.doesExist).toBe(true);
    expect(result.beats.detected.mightExist).toBe(true);
    expect(result.logstash.detected.mightExist).toBe(true);
  });

  it('should work properly when security is disabled', async () => {
    const req = mockReq({ hits: { total: { value: 1 } } }, false);
    const result = await getCollectionStatus(req, liveClusterUuid);
    expect(result.kibana.detected.doesExist).toBe(true);
  });

  it('should work properly with an unknown security message', async () => {
    const req = mockReq({ hits: { total: { value: 1 } } }, true, true, 'foobar');
    const result = await getCollectionStatus(req, liveClusterUuid);
    expect(result._meta.hasPermissions).toBe(false);
  });

  it('should work properly with a known security message', async () => {
    const req = mockReq(
      { hits: { total: { value: 1 } } },
      true,
      true,
      'no handler found for uri [/_security/user/_has_privileges] and method [POST]'
    );
    const result = await getCollectionStatus(req, liveClusterUuid);
    expect(result.kibana.detected.doesExist).toBe(true);
  });

  it('should work properly with another known security message', async () => {
    const req = mockReq(
      { hits: { total: { value: 1 } } },
      true,
      true,
      'Invalid index name [_security]'
    );
    const result = await getCollectionStatus(req, liveClusterUuid);
    expect(result.kibana.detected.doesExist).toBe(true);
  });

  it('should not work if the user does not have the necessary permissions', async () => {
    const req = mockReq({ hits: { total: { value: 1 } } }, true, false);
    const result = await getCollectionStatus(req, liveClusterUuid);
    expect(result._meta.hasPermissions).toBe(false);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { getESUpgradeStatus } from './es_deprecations_status';
import fakeDeprecations from './__fixtures__/fake_deprecations.json';

const fakeIndexNames = Object.keys(fakeDeprecations.index_settings);

describe('getESUpgradeStatus', () => {
  const resolvedIndices = {
    indices: fakeIndexNames.map((indexName) => {
      // mark one index as closed to test blockerForReindexing flag
      if (indexName === 'closed_index') {
        return { name: indexName, attributes: ['closed'] };
      }
      return { name: indexName, attributes: ['open'] };
    }),
  };

  // @ts-expect-error mock data is too loosely typed
  const deprecationsResponse: estypes.MigrationDeprecationsResponse = _.cloneDeep(fakeDeprecations);

  const esClient = elasticsearchServiceMock.createScopedClusterClient();

  esClient.asCurrentUser.migration.deprecations.mockResponse(deprecationsResponse);

  esClient.asCurrentUser.transport.request.mockResolvedValue({
    features: [
      {
        feature_name: 'machine_learning',
        minimum_index_version: '7.1.1',
        migration_status: 'MIGRATION_NEEDED',
        indices: [
          {
            index: '.ml-config',
            version: '7.1.1',
          },
        ],
      },
    ],
    migration_status: 'MIGRATION_NEEDED',
  });

  // @ts-expect-error not full interface of response
  esClient.asCurrentUser.indices.resolveIndex.mockResponse(resolvedIndices);

  it('calls /_migration/deprecations', async () => {
    await getESUpgradeStatus(esClient);
    expect(esClient.asCurrentUser.migration.deprecations).toHaveBeenCalled();
  });

  it('returns the correct shape of data', async () => {
    const resp = await getESUpgradeStatus(esClient);
    expect(resp).toMatchSnapshot();
  });

  it('returns totalCriticalDeprecations > 0 when critical issues found', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResponse({
      // @ts-expect-error not full interface
      cluster_settings: [{ level: 'critical', message: 'Do count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
    });

    await expect(getESUpgradeStatus(esClient)).resolves.toHaveProperty(
      'totalCriticalDeprecations',
      1
    );
  });

  it('returns totalCriticalDeprecations === 0 when no critical issues found', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResponse({
      // @ts-expect-error not full interface
      cluster_settings: [{ level: 'warning', message: 'Do not count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
    });

    await expect(getESUpgradeStatus(esClient)).resolves.toHaveProperty(
      'totalCriticalDeprecations',
      0
    );
  });

  it('filters out system indices returned by upgrade system indices API', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResponse({
      cluster_settings: [],
      node_settings: [],
      ml_settings: [],
      index_settings: {
        '.ml-config': [
          {
            level: 'critical',
            message: 'Index created before 7.0',
            url: 'https://',
            details: '...',
            // @ts-expect-error not full interface
            resolve_during_rolling_upgrade: false,
          },
        ],
      },
    });

    const upgradeStatus = await getESUpgradeStatus(esClient);

    expect(upgradeStatus.deprecations).toHaveLength(0);
    expect(upgradeStatus.totalCriticalDeprecations).toBe(0);
  });
});

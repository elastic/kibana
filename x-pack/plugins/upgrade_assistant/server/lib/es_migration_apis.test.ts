/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { RequestEvent } from '@elastic/elasticsearch/lib/Transport';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { DeprecationAPIResponse } from '../../common/types';

import { getUpgradeAssistantStatus } from './es_migration_apis';
import fakeDeprecations from './__fixtures__/fake_deprecations.json';

const fakeIndexNames = Object.keys(fakeDeprecations.index_settings);

const asApiResponse = <T>(body: T): RequestEvent<T> =>
  ({
    body,
  } as RequestEvent<T>);

describe('getUpgradeAssistantStatus', () => {
  const resolvedIndices = {
    indices: fakeIndexNames.map((f) => ({ name: f, attributes: ['open'] })),
  };
  // @ts-expect-error mock data is too loosely typed
  const deprecationsResponse: DeprecationAPIResponse = _.cloneDeep(fakeDeprecations);

  const esClient = elasticsearchServiceMock.createScopedClusterClient();

  esClient.asCurrentUser.migration.deprecations.mockResolvedValue(
    asApiResponse(deprecationsResponse)
  );

  esClient.asCurrentUser.indices.resolveIndex.mockResolvedValue(asApiResponse(resolvedIndices));

  it('calls /_migration/deprecations', async () => {
    await getUpgradeAssistantStatus(esClient, false);
    expect(esClient.asCurrentUser.migration.deprecations).toHaveBeenCalled();
  });

  it('returns the correct shape of data', async () => {
    const resp = await getUpgradeAssistantStatus(esClient, false);
    expect(resp).toMatchSnapshot();
  });

  it('returns readyForUpgrade === false when critical issues found', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResolvedValue(
      asApiResponse({
        cluster_settings: [{ level: 'critical', message: 'Do count me', url: 'https://...' }],
        node_settings: [],
        ml_settings: [],
        index_settings: {},
      })
    );

    await expect(getUpgradeAssistantStatus(esClient, false)).resolves.toHaveProperty(
      'readyForUpgrade',
      false
    );
  });

  it('returns readyForUpgrade === true when no critical issues found', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResolvedValue(
      asApiResponse({
        cluster_settings: [{ level: 'warning', message: 'Do not count me', url: 'https://...' }],
        node_settings: [],
        ml_settings: [],
        index_settings: {},
      })
    );

    await expect(getUpgradeAssistantStatus(esClient, false)).resolves.toHaveProperty(
      'readyForUpgrade',
      true
    );
  });

  it('filters out security realm deprecation on Cloud', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResolvedValue(
      asApiResponse({
        cluster_settings: [
          {
            level: 'critical',
            message: 'Security realm settings structure changed',
            url: 'https://...',
          },
        ],
        node_settings: [],
        ml_settings: [],
        index_settings: {},
      })
    );

    const result = await getUpgradeAssistantStatus(esClient, true);

    expect(result).toHaveProperty('readyForUpgrade', true);
    expect(result).toHaveProperty('cluster', []);
  });
});

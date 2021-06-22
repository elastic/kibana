/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    indices: fakeIndexNames.map((indexName) => {
      // mark one index as closed to test blockerForReindexing flag
      if (indexName === 'closed_index') {
        return { name: indexName, attributes: ['closed'] };
      }
      return { name: indexName, attributes: ['open'] };
    }),
  };

  // @ts-expect-error mock data is too loosely typed
  const deprecationsResponse: DeprecationAPIResponse = _.cloneDeep(fakeDeprecations);

  const esClient = elasticsearchServiceMock.createScopedClusterClient();

  esClient.asCurrentUser.migration.deprecations.mockResolvedValue(
    // @ts-expect-error not full interface
    asApiResponse(deprecationsResponse)
  );

  // @ts-expect-error not full interface of response
  esClient.asCurrentUser.indices.resolveIndex.mockResolvedValue(asApiResponse(resolvedIndices));

  it('calls /_migration/deprecations', async () => {
    await getUpgradeAssistantStatus(esClient);
    expect(esClient.asCurrentUser.migration.deprecations).toHaveBeenCalled();
  });

  it('returns the correct shape of data', async () => {
    const resp = await getUpgradeAssistantStatus(esClient);
    expect(resp).toMatchSnapshot();
  });

  it('returns readyForUpgrade === false when critical issues found', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResolvedValue(
      // @ts-expect-error not full interface
      asApiResponse({
        cluster_settings: [{ level: 'critical', message: 'Do count me', url: 'https://...' }],
        node_settings: [],
        ml_settings: [],
        index_settings: {},
      })
    );

    await expect(getUpgradeAssistantStatus(esClient)).resolves.toHaveProperty(
      'readyForUpgrade',
      false
    );
  });

  it('returns readyForUpgrade === true when no critical issues found', async () => {
    esClient.asCurrentUser.migration.deprecations.mockResolvedValue(
      // @ts-expect-error not full interface
      asApiResponse({
        cluster_settings: [{ level: 'warning', message: 'Do not count me', url: 'https://...' }],
        node_settings: [],
        ml_settings: [],
        index_settings: {},
      })
    );

    await expect(getUpgradeAssistantStatus(esClient)).resolves.toHaveProperty(
      'readyForUpgrade',
      true
    );
  });
});

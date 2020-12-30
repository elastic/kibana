/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { DeprecationAPIResponse } from '../../../../../src/core/server/elasticsearch/legacy/api_types';

import { getUpgradeAssistantStatus } from './es_migration_apis';
import fakeDeprecations from './__fixtures__/fake_deprecations.json';

const fakeIndexNames = Object.keys(fakeDeprecations.index_settings);

describe('getUpgradeAssistantStatus', () => {
  const resolvedIndices = {
    indices: fakeIndexNames.map((f) => ({ name: f, attributes: ['open'] })),
  };
  let deprecationsResponse: DeprecationAPIResponse;

  const dataClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
  (dataClient.callAsCurrentUser as jest.Mock).mockImplementation(async (api, { path }) => {
    if (path === '/_migration/deprecations') {
      return deprecationsResponse;
    } else if (path === '/_resolve/index/*') {
      return resolvedIndices;
    } else if (api === 'indices.getMapping') {
      return {};
    } else {
      throw new Error(`Unexpected API call: ${path}`);
    }
  });

  beforeEach(() => {
    // @ts-expect-error mock data is too loosely typed
    deprecationsResponse = _.cloneDeep(fakeDeprecations);
  });

  it('calls /_migration/deprecations', async () => {
    await getUpgradeAssistantStatus(dataClient, false);
    expect(dataClient.callAsCurrentUser).toHaveBeenCalledWith('transport.request', {
      path: '/_migration/deprecations',
      method: 'GET',
    });
  });

  it('returns the correct shape of data', async () => {
    const resp = await getUpgradeAssistantStatus(dataClient, false);
    expect(resp).toMatchSnapshot();
  });

  it('returns readyForUpgrade === false when critical issues found', async () => {
    deprecationsResponse = {
      cluster_settings: [{ level: 'critical', message: 'Do count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
    };

    await expect(getUpgradeAssistantStatus(dataClient, false)).resolves.toHaveProperty(
      'readyForUpgrade',
      false
    );
  });

  it('returns readyForUpgrade === true when no critical issues found', async () => {
    deprecationsResponse = {
      cluster_settings: [{ level: 'warning', message: 'Do not count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
    };

    await expect(getUpgradeAssistantStatus(dataClient, false)).resolves.toHaveProperty(
      'readyForUpgrade',
      true
    );
  });

  it('filters out security realm deprecation on Cloud', async () => {
    deprecationsResponse = {
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
    };

    const result = await getUpgradeAssistantStatus(dataClient, true);

    expect(result).toHaveProperty('readyForUpgrade', true);
    expect(result).toHaveProperty('cluster', []);
  });
});

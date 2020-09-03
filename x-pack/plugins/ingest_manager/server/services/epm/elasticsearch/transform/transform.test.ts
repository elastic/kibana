/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../packages/get', () => {
  return { getInstallation: jest.fn() };
});

jest.mock('../../packages/install', () => {
  return { saveInstalledEsRefs: jest.fn() };
});

jest.mock('../../registry', () => {
  const original = jest.requireActual('../../registry');
  return {
    ...original,
    getAsset: jest.fn(),
  };
});

import { installTransformForDataset } from './install';
import { ILegacyScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';
import { ElasticsearchAssetType, Installation, RegistryPackage } from '../../../../types';
import { getInstallation } from '../../packages';
import { saveInstalledEsRefs } from '../../packages/install';
import { getAsset } from '../../registry';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { savedObjectsClientMock } from '../../../../../../../../src/core/server/saved_objects/service/saved_objects_client.mock';

describe('test transform install', () => {
  beforeEach(() => {});
  afterEach(() => {});
  test('can install new version and removes older version', async () => {
    const legacyScopedClusterClient: jest.Mocked<ILegacyScopedClusterClient> = {
      callAsInternalUser: jest.fn(),
      callAsCurrentUser: jest.fn(),
    };

    const savedObjectsClient: jest.Mocked<SavedObjectsClientContract> = savedObjectsClientMock.create();
    const previousInstallation: Installation = ({
      installed_es: [
        {
          id: 'metrics-endpoint.metadata-current-default-0.15.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown) as Installation;

    const currentInstallation: Installation = ({
      installed_es: [
        {
          id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown) as Installation;
    (getAsset as jest.MockedFunction<typeof getAsset>).mockReturnValueOnce(
      Buffer.from('{"content": "data"}', 'utf8')
    );
    (getInstallation as jest.MockedFunction<typeof getInstallation>)
      .mockReturnValueOnce(Promise.resolve(previousInstallation))
      .mockReturnValueOnce(Promise.resolve(currentInstallation));

    const saveInstalledEsRefsMock = saveInstalledEsRefs as jest.MockedFunction<
      typeof saveInstalledEsRefs
    >;

    await installTransformForDataset(
      ({
        name: 'endpoint',
        version: '0.16.0-dev.0',
        datasets: [
          {
            type: 'metrics',
            name: 'endpoint.metadata_current',
            title: 'Endpoint Metadata',
            release: 'experimental',
            package: 'endpoint',
            ingest_pipeline: 'default',
            elasticsearch: {
              'index_template.mappings': {
                dynamic: false,
              },
            },
            path: 'metadata_current',
          },
        ],
      } as unknown) as RegistryPackage,
      [
        'endpoint-0.16.0-dev.0/dataset/metadata_current/elasticsearch/transform/current-default.json',
      ],
      legacyScopedClusterClient.callAsCurrentUser,
      savedObjectsClient
    );

    expect(legacyScopedClusterClient.callAsCurrentUser.mock.calls).toEqual([
      [
        'transport.request',
        {
          method: 'POST',
          path: '/_transform/metrics-endpoint.metadata-current-default-0.15.0-dev.0/_stop',
          query: 'force=true',
          ignore: [404],
        },
      ],
      [
        'transport.request',
        {
          method: 'DELETE',
          query: 'force=true',
          path: '_transform/metrics-endpoint.metadata-current-default-0.15.0-dev.0',
          ignore: [404, 400],
        },
      ],
      [
        'transport.request',
        {
          method: 'DELETE',
          query: 'force=true',
          path: '_transform/metrics-endpoint.metadata_current-current-default-0.16.0-dev.0',
          ignore: [404, 400],
        },
      ],
      [
        'transport.request',
        {
          method: 'PUT',
          path: '/_transform/metrics-endpoint.metadata_current-current-default-0.16.0-dev.0',
          query: 'defer_validation=true',
          body: '{"content": "data"}',
        },
      ],
      [
        'transport.request',
        {
          method: 'POST',
          path: '/_transform/metrics-endpoint.metadata_current-current-default-0.16.0-dev.0/_start',
        },
      ],
    ]);

    expect(saveInstalledEsRefsMock.mock.calls[0][2]).toEqual([
      {
        id: 'metrics-endpoint.metadata_current-current-default-0.16.0-dev.0',
        type: 'transform',
      },
    ]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { savedObjectsClientMock } from '../../../../../../../../src/core/server/saved_objects/service/saved_objects_client.mock';
import { deleteTransformRefs } from './remove';
import { EsAssetReference } from '../../../../../common/types/models';

describe('test transform install', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
  });

  test('can delete transform ref and handle duplicate when previous version and current version are the same', async () => {
    await deleteTransformRefs(
      savedObjectsClient,
      [
        { id: 'metrics-endpoint.policy-0.16.0-dev.0', type: 'ingest_pipeline' },
        { id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0', type: 'transform' },
      ] as EsAssetReference[],
      'endpoint',
      ['metrics-endpoint.metadata-current-default-0.16.0-dev.0'],
      ['metrics-endpoint.metadata-current-default-0.16.0-dev.0']
    );
    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            { id: 'metrics-endpoint.policy-0.16.0-dev.0', type: 'ingest_pipeline' },
            { id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0', type: 'transform' },
          ],
        },
      ],
    ]);
  });

  test('can delete transform ref when previous version and current version are not the same', async () => {
    await deleteTransformRefs(
      savedObjectsClient,
      [
        { id: 'metrics-endpoint.policy-0.16.0-dev.0', type: 'ingest_pipeline' },
        { id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0', type: 'transform' },
      ] as EsAssetReference[],
      'endpoint',
      ['metrics-endpoint.metadata-current-default-0.15.0-dev.0'],
      ['metrics-endpoint.metadata-current-default-0.16.0-dev.0']
    );

    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            { id: 'metrics-endpoint.policy-0.16.0-dev.0', type: 'ingest_pipeline' },
            { id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0', type: 'transform' },
          ],
        },
      ],
    ]);
  });
});

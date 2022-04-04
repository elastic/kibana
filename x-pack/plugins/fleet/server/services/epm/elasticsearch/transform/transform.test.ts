/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/order
import { createAppContextStartContractMock } from '../../../../mocks';

jest.mock('../../packages/get', () => {
  return { getInstallation: jest.fn(), getInstallationObject: jest.fn() };
});

jest.mock('./common', () => {
  return {
    getAsset: jest.fn(),
  };
});

import { errors } from '@elastic/elasticsearch';
import type { SavedObject, SavedObjectsClientContract } from 'kibana/server';
import { loggerMock } from '@kbn/logging-mocks';

import { ElasticsearchAssetType } from '../../../../types';
import type { Installation, RegistryPackage } from '../../../../types';
import { getInstallation, getInstallationObject } from '../../packages';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { savedObjectsClientMock } from '../../../../../../../../src/core/server/saved_objects/service/saved_objects_client.mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../../../src/core/server/elasticsearch/client/mocks';
import { appContextService } from '../../../app_context';

import { getESAssetMetadata } from '../meta';

import { installTransform } from './install';
import { getAsset } from './common';

describe('test transform install', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    (getInstallation as jest.MockedFunction<typeof getInstallation>).mockReset();
    (getInstallationObject as jest.MockedFunction<typeof getInstallationObject>).mockReset();
    savedObjectsClient = savedObjectsClientMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('can install new versions and removes older version', async () => {
    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.policy-0.16.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.15.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.policy-0.16.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.15.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'endpoint.metadata_current-default-0.16.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'endpoint.metadata-default-0.16.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;
    (getAsset as jest.MockedFunction<typeof getAsset>)
      .mockReturnValueOnce(Buffer.from('{"content": "data"}', 'utf8'))
      .mockReturnValueOnce(Buffer.from('{"content": "data"}', 'utf8'));

    (getInstallation as jest.MockedFunction<typeof getInstallation>)
      .mockReturnValueOnce(Promise.resolve(previousInstallation))
      .mockReturnValueOnce(Promise.resolve(currentInstallation));

    (
      getInstallationObject as jest.MockedFunction<typeof getInstallationObject>
    ).mockReturnValueOnce(
      Promise.resolve({
        attributes: {
          installed_es: previousInstallation.installed_es,
        },
      } as unknown as SavedObject<Installation>)
    );

    esClient.transform.getTransform.mockResponseOnce({
      count: 1,
      transforms: [
        // @ts-expect-error incomplete data
        {
          dest: {
            index: 'index',
          },
        },
      ],
    });

    await installTransform(
      {
        name: 'endpoint',
        version: '0.16.0-dev.0',
        data_streams: [
          {
            type: 'metrics',
            dataset: 'endpoint.metadata',
            title: 'Endpoint Metadata',
            release: 'experimental',
            package: 'endpoint',
            ingest_pipeline: 'default',
            elasticsearch: {
              'index_template.mappings': {
                dynamic: false,
              },
            },
            path: 'metadata',
          },
          {
            type: 'metrics',
            dataset: 'endpoint.metadata_current',
            title: 'Endpoint Metadata Current',
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
      } as unknown as RegistryPackage,
      [
        'endpoint-0.16.0-dev.0/data_stream/policy/elasticsearch/ingest_pipeline/default.json',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata/default.json',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json',
      ],
      esClient,
      savedObjectsClient,
      loggerMock.create()
    );

    expect(esClient.transform.getTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.15.0-dev.0',
        },
        { ignore: [404] },
      ],
    ]);
    expect(esClient.transform.stopTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.15.0-dev.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);
    expect(esClient.transform.deleteTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.15.0-dev.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);

    expect(esClient.transport.request.mock.calls).toEqual([
      [
        {
          method: 'DELETE',
          path: '/index',
        },
        { ignore: [404] },
      ],
    ]);

    const meta = getESAssetMetadata({ packageName: 'endpoint' });

    expect(esClient.transform.putTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-default-0.16.0-dev.0',
          defer_validation: true,
          body: { content: 'data', _meta: meta },
        },
      ],
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
          defer_validation: true,
          body: { content: 'data', _meta: meta },
        },
      ],
    ]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-default-0.16.0-dev.0',
        },
        { ignore: [409] },
      ],
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
        },
        { ignore: [409] },
      ],
    ]);

    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            {
              id: 'metrics-endpoint.policy-0.16.0-dev.0',
              type: 'ingest_pipeline',
            },
            {
              id: 'endpoint.metadata_current-default-0.15.0-dev.0',
              type: 'transform',
            },
            {
              id: 'endpoint.metadata-default-0.16.0-dev.0',
              type: 'transform',
            },
            {
              id: 'endpoint.metadata_current-default-0.16.0-dev.0',
              type: 'transform',
            },
          ],
        },
      ],
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            {
              id: 'metrics-endpoint.policy-0.16.0-dev.0',
              type: 'ingest_pipeline',
            },
            {
              id: 'endpoint.metadata_current-default-0.16.0-dev.0',
              type: 'transform',
            },
            {
              id: 'endpoint.metadata-default-0.16.0-dev.0',
              type: 'transform',
            },
          ],
        },
      ],
    ]);
  });

  test('can install new version and when no older version', async () => {
    const previousInstallation: Installation = {
      installed_es: [],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;
    (getAsset as jest.MockedFunction<typeof getAsset>).mockReturnValueOnce(
      Buffer.from('{"content": "data"}', 'utf8')
    );
    (getInstallation as jest.MockedFunction<typeof getInstallation>)
      .mockReturnValueOnce(Promise.resolve(previousInstallation))
      .mockReturnValueOnce(Promise.resolve(currentInstallation));

    (
      getInstallationObject as jest.MockedFunction<typeof getInstallationObject>
    ).mockReturnValueOnce(
      Promise.resolve({
        attributes: { installed_es: [] },
      } as unknown as SavedObject<Installation>)
    );

    await installTransform(
      {
        name: 'endpoint',
        version: '0.16.0-dev.0',
        data_streams: [
          {
            type: 'metrics',
            dataset: 'endpoint.metadata_current',
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
      } as unknown as RegistryPackage,
      ['endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json'],
      esClient,
      savedObjectsClient,
      loggerMock.create()
    );

    const meta = getESAssetMetadata({ packageName: 'endpoint' });

    expect(esClient.transform.putTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
          defer_validation: true,
          body: { content: 'data', _meta: meta },
        },
      ],
    ]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
        },
        { ignore: [409] },
      ],
    ]);

    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            { id: 'endpoint.metadata_current-default-0.16.0-dev.0', type: 'transform' },
          ],
        },
      ],
    ]);
  });

  test('can removes older version when no new install in package', async () => {
    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'endpoint.metadata-current-default-0.15.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [],
    } as unknown as Installation;

    (getInstallation as jest.MockedFunction<typeof getInstallation>)
      .mockReturnValueOnce(Promise.resolve(previousInstallation))
      .mockReturnValueOnce(Promise.resolve(currentInstallation));

    (
      getInstallationObject as jest.MockedFunction<typeof getInstallationObject>
    ).mockReturnValueOnce(
      Promise.resolve({
        attributes: { installed_es: currentInstallation.installed_es },
      } as unknown as SavedObject<Installation>)
    );

    esClient.transform.getTransform.mockResponseOnce({
      count: 1,
      transforms: [
        // @ts-expect-error incomplete data
        {
          dest: {
            index: 'index',
          },
        },
      ],
    });

    await installTransform(
      {
        name: 'endpoint',
        version: '0.16.0-dev.0',
        data_streams: [
          {
            type: 'metrics',
            dataset: 'endpoint.metadata',
            title: 'Endpoint Metadata',
            release: 'experimental',
            package: 'endpoint',
            ingest_pipeline: 'default',
            elasticsearch: {
              'index_template.mappings': {
                dynamic: false,
              },
            },
            path: 'metadata',
          },
          {
            type: 'metrics',
            dataset: 'endpoint.metadata_current',
            title: 'Endpoint Metadata Current',
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
      } as unknown as RegistryPackage,
      [],
      esClient,
      savedObjectsClient,
      loggerMock.create()
    );

    expect(esClient.transform.getTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-current-default-0.15.0-dev.0',
        },
        { ignore: [404] },
      ],
    ]);

    expect(esClient.transform.stopTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-current-default-0.15.0-dev.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);

    expect(esClient.transform.deleteTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-current-default-0.15.0-dev.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);

    expect(esClient.transport.request.mock.calls).toEqual([
      [
        {
          method: 'DELETE',
          path: '/index',
        },
        { ignore: [404] },
      ],
    ]);

    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [],
        },
      ],
    ]);
  });

  test('ignore already exists error if saved object and ES transforms are out of sync', async () => {
    const previousInstallation: Installation = {
      installed_es: [],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;
    (getAsset as jest.MockedFunction<typeof getAsset>).mockReturnValueOnce(
      Buffer.from('{"content": "data"}', 'utf8')
    );
    (getInstallation as jest.MockedFunction<typeof getInstallation>)
      .mockReturnValueOnce(Promise.resolve(previousInstallation))
      .mockReturnValueOnce(Promise.resolve(currentInstallation));

    (
      getInstallationObject as jest.MockedFunction<typeof getInstallationObject>
    ).mockReturnValueOnce(
      Promise.resolve({
        attributes: { installed_es: [] },
      } as unknown as SavedObject<Installation>)
    );

    esClient.transport.request.mockImplementationOnce(() =>
      elasticsearchClientMock.createErrorTransportRequestPromise(
        new errors.ResponseError(
          elasticsearchClientMock.createApiResponse({
            statusCode: 400,
            body: { error: { type: 'resource_already_exists_exception' } },
          })
        )
      )
    );

    await installTransform(
      {
        name: 'endpoint',
        version: '0.16.0-dev.0',
        data_streams: [
          {
            type: 'metrics',
            dataset: 'endpoint.metadata_current',
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
      } as unknown as RegistryPackage,
      ['endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json'],
      esClient,
      savedObjectsClient,
      loggerMock.create()
    );

    const meta = getESAssetMetadata({ packageName: 'endpoint' });

    expect(esClient.transform.putTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0',
          defer_validation: true,
          body: { content: 'data', _meta: meta },
        },
      ],
    ]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [{ transform_id: 'endpoint.metadata_current-default-0.16.0-dev.0' }, { ignore: [409] }],
    ]);

    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            { id: 'endpoint.metadata_current-default-0.16.0-dev.0', type: 'transform' },
          ],
        },
      ],
    ]);
  });
});

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

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { getInstallation, getInstallationObject } from '../../packages';
import type { Installation, RegistryPackage } from '../../../../types';
import { ElasticsearchAssetType } from '../../../../types';
import { appContextService } from '../../../app_context';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../constants';

import { getESAssetMetadata } from '../meta';

import { installTransforms } from './install';
import { getAsset } from './common';

const meta = getESAssetMetadata({ packageName: 'endpoint' });

describe('test transform install', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  const getYamlTestData = (autoStart: boolean | undefined = undefined) => {
    const start =
      autoStart === undefined
        ? ''
        : `
start: ${autoStart}`;
    return {
      MANIFEST:
        `destination_index_template:
  settings:
    index:
      codec: best_compression
      refresh_interval: 5s
      number_of_shards: 1
      number_of_routing_shards: 30
      hidden: true
  mappings:
    dynamic: false
    _meta: {}
    dynamic_templates:
      - strings_as_keyword:
          match_mapping_type: string
          mapping:
            ignore_above: 1024
            type: keyword
    date_detection: false` + start,
      TRANSFORM: `source:
  index:
    - metrics-endpoint.metadata_current_default*
    - ".fleet-agents*"
dest:
  index: ".metrics-endpoint.metadata_united_default"
frequency: 1s
sync:
  time:
    delay: 4s
    field: updated_at
pivot:
  aggs:
    united:
      scripted_metric:
        init_script: state.docs = []
        map_script: state.docs.add(new HashMap(params['_source']))
        combine_script: return state.docs
        reduce_script: def ret = new HashMap(); for (s in states) { for (d in s) { if (d.containsKey('Endpoint')) { ret.endpoint = d } else { ret.agent = d } }} return ret
  group_by:
    agent.id:
      terms:
        field: agent.id
description: Merges latest endpoint and Agent metadata documents.
_meta:
  managed: true`,
      FIELDS: `- name: '@timestamp'
  type: date
- name: updated_at
  type: alias
  path: event.ingested`,
    };
  };
  const getExpectedData = () => {
    return {
      TRANSFORM: {
        transform_id: 'logs-endpoint.metadata_current-default-0.16.0-dev.0',
        defer_validation: true,
        body: {
          description: 'Merges latest endpoint and Agent metadata documents.',
          dest: {
            index: '.metrics-endpoint.metadata_united_default',
          },
          frequency: '1s',
          pivot: {
            aggs: {
              united: {
                scripted_metric: {
                  combine_script: 'return state.docs',
                  init_script: 'state.docs = []',
                  map_script: "state.docs.add(new HashMap(params['_source']))",
                  reduce_script:
                    "def ret = new HashMap(); for (s in states) { for (d in s) { if (d.containsKey('Endpoint')) { ret.endpoint = d } else { ret.agent = d } }} return ret",
                },
              },
            },
            group_by: {
              'agent.id': {
                terms: {
                  field: 'agent.id',
                },
              },
            },
          },
          source: {
            index: ['metrics-endpoint.metadata_current_default*', '.fleet-agents*'],
          },
          sync: {
            time: {
              delay: '4s',
              field: 'updated_at',
            },
          },
          _meta: meta,
        },
      },
    };
  };

  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    (getInstallation as jest.MockedFunction<typeof getInstallation>).mockReset();
    (getInstallationObject as jest.MockedFunction<typeof getInstallationObject>).mockReset();
    savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.update.mockImplementation(async (type, id, attributes) => ({
      type: PACKAGES_SAVED_OBJECT_TYPE,
      id: 'endpoint',
      attributes,
      references: [],
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('can install new versions and removes older version when start is not defined', async () => {
    const sourceData = getYamlTestData();
    const expectedData = getExpectedData();

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
      .mockReturnValueOnce(Buffer.from(sourceData.MANIFEST, 'utf8'))
      .mockReturnValueOnce(Buffer.from(sourceData.TRANSFORM, 'utf8'));

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

    // Mock transform from old version
    esClient.transform.getTransform.mockResponseOnce({
      count: 1,
      transforms: [
        // @ts-expect-error incomplete data
        {
          dest: {
            index: 'mock-old-destination-index',
          },
        },
      ],
    });

    await installTransforms(
      {
        name: 'endpoint',
        version: '0.16.0-dev.0',
      } as unknown as RegistryPackage,
      [
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/manifest.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/transform.yml',
      ],
      esClient,
      savedObjectsClient,
      loggerMock.create(),
      previousInstallation.installed_es
    );

    expect(esClient.transform.getTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.15.0-dev.0',
        },
        { ignore: [404] },
      ],
    ]);
    // Stop and delete previously installed transforms
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

    // Delete destination index
    expect(esClient.transport.request.mock.calls).toEqual([
      [
        {
          method: 'DELETE',
          path: '/mock-old-destination-index',
        },
        { ignore: [404] },
      ],
    ]);

    // Create a @package component template and an empty @custom component template
    expect(esClient.cluster.putComponentTemplate.mock.calls).toEqual([
      [
        {
          body: {
            _meta: meta,
            template: {
              mappings: {
                _meta: {},
                date_detection: false,
                dynamic: false,
                dynamic_templates: [
                  {
                    strings_as_keyword: {
                      mapping: { ignore_above: 1024, type: 'keyword' },
                      match_mapping_type: 'string',
                    },
                  },
                ],
                properties: {},
              },
              settings: {
                index: {
                  codec: 'best_compression',
                  hidden: true,
                  mapping: { total_fields: { limit: '10000' } },
                  number_of_routing_shards: 30,
                  number_of_shards: 1,
                  refresh_interval: '5s',
                },
              },
            },
          },
          create: false,
          name: 'logs-endpoint.metadata_current-template@package',
        },
        { ignore: [404] },
      ],
      [
        {
          body: {
            _meta: meta,
            template: { settings: {} },
          },
          create: true,
          name: 'logs-endpoint.metadata_current-template@custom',
        },
        { ignore: [404] },
      ],
    ]);

    // Index template composed of the two component templates created
    // with index pattern matching the destination index
    expect(esClient.indices.putIndexTemplate.mock.calls).toEqual([
      [
        {
          body: {
            _meta: meta,
            composed_of: [
              'logs-endpoint.metadata_current-template@package',
              'logs-endpoint.metadata_current-template@custom',
            ],
            index_patterns: ['.metrics-endpoint.metadata_united_default'],
            priority: 250,
            template: { mappings: undefined, settings: undefined },
          },
          name: 'logs-endpoint.metadata_current-template',
        },
        { ignore: [404] },
      ],
    ]);

    // Destination index is created before transform is created
    expect(esClient.indices.create.mock.calls).toEqual([
      [{ index: '.metrics-endpoint.metadata_united_default' }, { ignore: [400] }],
    ]);

    expect(esClient.transform.putTransform.mock.calls).toEqual([[expectedData.TRANSFORM]]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'logs-endpoint.metadata_current-default-0.16.0-dev.0',
        },
        { ignore: [409] },
      ],
    ]);

    // Saved object is updated with newly created index templates, component templates, transform
    expect(savedObjectsClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            {
              id: 'metrics-endpoint.policy-0.16.0-dev.0',
              type: ElasticsearchAssetType.ingestPipeline,
            },
            {
              id: 'logs-endpoint.metadata_current-template',
              type: ElasticsearchAssetType.indexTemplate,
            },
            {
              id: 'logs-endpoint.metadata_current-template@custom',
              type: ElasticsearchAssetType.componentTemplate,
            },
            {
              id: 'logs-endpoint.metadata_current-template@package',
              type: ElasticsearchAssetType.componentTemplate,
            },
            {
              id: 'logs-endpoint.metadata_current-default-0.16.0-dev.0',
              type: ElasticsearchAssetType.transform,
            },
          ],
        },
        {
          refresh: false,
        },
      ],
    ]);
  });

  test('can install new version when no older version', async () => {
    const sourceData = getYamlTestData(true);
    const expectedData = getExpectedData();

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
      Buffer.from(sourceData.TRANSFORM, 'utf8')
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

    await installTransforms(
      {
        name: 'endpoint',
        version: '0.16.0-dev.0',
      } as unknown as RegistryPackage,
      ['endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/transform.yml'],
      esClient,
      savedObjectsClient,
      loggerMock.create(),
      previousInstallation.installed_es
    );

    expect(esClient.transform.putTransform.mock.calls).toEqual([[expectedData.TRANSFORM]]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'logs-endpoint.metadata_current-default-0.16.0-dev.0',
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
            { id: 'logs-endpoint.metadata_current-default-0.16.0-dev.0', type: 'transform' },
          ],
        },
        {
          refresh: false,
        },
      ],
    ]);
  });

  test('can combine settings fields.yml & manifest.yml and not start transform automatically', async () => {
    const sourceData = getYamlTestData(false);
    const expectedData = getExpectedData();

    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'endpoint.metadata-current-default-0.15.0-dev.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'logs-endpoint.metadata_current-template',
          type: ElasticsearchAssetType.indexTemplate,
        },
        {
          id: 'logs-endpoint.metadata_current-template@custom',
          type: ElasticsearchAssetType.componentTemplate,
        },
        {
          id: 'logs-endpoint.metadata_current-template@package',
          type: ElasticsearchAssetType.componentTemplate,
        },
      ],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [],
    } as unknown as Installation;

    (getAsset as jest.MockedFunction<typeof getAsset>)
      .mockReturnValueOnce(Buffer.from(sourceData.FIELDS, 'utf8'))
      .mockReturnValueOnce(Buffer.from(sourceData.MANIFEST, 'utf8'))
      .mockReturnValueOnce(Buffer.from(sourceData.TRANSFORM, 'utf8'));

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
            index: 'mock-old-destination-index',
          },
        },
      ],
    });

    await installTransforms(
      {
        name: 'endpoint',
        version: '0.16.0-dev.0',
      } as unknown as RegistryPackage,
      [
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/fields/fields.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/manifest.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/transform.yml',
      ],
      esClient,
      savedObjectsClient,
      loggerMock.create(),
      previousInstallation.installed_es
    );

    expect(esClient.transform.getTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata-current-default-0.15.0-dev.0',
        },
        { ignore: [404] },
      ],
    ]);

    // Transform from old version is stopped & deleted
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

    // Destination index from old version is also deleted
    expect(esClient.transport.request.mock.calls).toEqual([
      [{ method: 'DELETE', path: '/mock-old-destination-index' }, { ignore: [404] }],
    ]);

    // Component templates are created with mappings from fields.yml
    // and template from manifest
    expect(esClient.cluster.putComponentTemplate.mock.calls).toEqual([
      [
        {
          name: 'logs-endpoint.metadata_current-template@package',
          body: {
            template: {
              settings: {
                index: {
                  codec: 'best_compression',
                  refresh_interval: '5s',
                  number_of_shards: 1,
                  number_of_routing_shards: 30,
                  hidden: true,
                  mapping: { total_fields: { limit: '10000' } },
                },
              },
              mappings: {
                properties: { '@timestamp': { type: 'date' } },
                dynamic_templates: [
                  {
                    strings_as_keyword: {
                      match_mapping_type: 'string',
                      mapping: { ignore_above: 1024, type: 'keyword' },
                    },
                  },
                ],
                dynamic: false,
                _meta: {},
                date_detection: false,
              },
            },
            _meta: meta,
          },
          create: false,
        },
        { ignore: [404] },
      ],
      [
        {
          name: 'logs-endpoint.metadata_current-template@custom',
          body: {
            template: { settings: {} },
            _meta: meta,
          },
          create: true,
        },
        { ignore: [404] },
      ],
    ]);
    // Index template composed of the two component templates created
    // with index pattern matching the destination index
    expect(esClient.indices.putIndexTemplate.mock.calls).toEqual([
      [
        {
          body: {
            _meta: meta,
            composed_of: [
              'logs-endpoint.metadata_current-template@package',
              'logs-endpoint.metadata_current-template@custom',
            ],
            index_patterns: ['.metrics-endpoint.metadata_united_default'],
            priority: 250,
            template: { mappings: undefined, settings: undefined },
          },
          name: 'logs-endpoint.metadata_current-template',
        },
        { ignore: [404] },
      ],
    ]);

    // Destination index is created before transform is created
    expect(esClient.indices.create.mock.calls).toEqual([
      [{ index: '.metrics-endpoint.metadata_united_default' }, { ignore: [400] }],
    ]);

    // New transform created but not not started automatically if start: false in manifest.yml
    expect(esClient.transform.putTransform.mock.calls).toEqual([[expectedData.TRANSFORM]]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([]);
  });
});

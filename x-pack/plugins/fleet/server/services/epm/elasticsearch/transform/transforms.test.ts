/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { HTTPAuthorizationHeader } from '../../../../../common/http_authorization_header';

import { getInstallation, getInstallationObject } from '../../packages';
import type { Installation, RegistryPackage } from '../../../../types';
import { ElasticsearchAssetType } from '../../../../types';
import { appContextService } from '../../../app_context';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../constants';

import { getESAssetMetadata } from '../meta';

import { createAppContextStartContractMock } from '../../../../mocks';

import { installTransforms } from './install';
import { getAsset } from './common';

jest.mock('../../packages/get', () => {
  return { getInstallation: jest.fn(), getInstallationObject: jest.fn() };
});

jest.mock('./common', () => {
  return {
    getAsset: jest.fn(),
  };
});

const meta = getESAssetMetadata({ packageName: 'endpoint' });

describe('test transform install', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  const authorizationHeader = new HTTPAuthorizationHeader(
    'Basic',
    'bW9uaXRvcmluZ191c2VyOm1scWFfYWRtaW4='
  );
  const getYamlTestData = (
    autoStart: boolean | undefined = undefined,
    transformVersion: string = '0.1.0'
  ) => {
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
  fleet_transform_version: ${transformVersion}
  managed: true`,
      FIELDS: `- name: '@timestamp'
  type: date
- name: updated_at
  type: alias
  path: event.ingested`,
    };
  };
  const getExpectedData = (transformVersion: string) => {
    return {
      TRANSFORM: {
        transform_id: `logs-endpoint.metadata_current-default-${transformVersion}`,
        defer_validation: true,
        body: {
          description: 'Merges latest endpoint and Agent metadata documents.',
          dest: {
            index: '.metrics-endpoint.metadata_united_default',
            aliases: [],
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
          _meta: { fleet_transform_version: transformVersion, ...meta, run_as_kibana_system: true },
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

  test('can install new versions and removes older version when fleet_transform_version increased', async () => {
    // Old fleet_transform_version is 0.1.0, fleet_transform_version to be installed is 0.1.0
    const sourceData = getYamlTestData(undefined, '0.2.0');
    const expectedData = getExpectedData('0.2.0');

    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.policy-0.16.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'logs-endpoint.metadata_current-default-0.1.0',
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
          id: 'logs-endpoint.metadata_current-default-0.2.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'logs-endpoint.metadata_current-default-0.2.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
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

    await installTransforms({
      installablePackage: {
        name: 'endpoint',
        version: '0.16.0-dev.0',
      } as unknown as RegistryPackage,
      paths: [
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/fields/fields.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/manifest.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/transform.yml',
      ],
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
    });

    // Stop and delete previously installed transforms
    expect(esClient.transform.stopTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'logs-endpoint.metadata_current-default-0.1.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);
    expect(esClient.transform.deleteTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'logs-endpoint.metadata_current-default-0.1.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);

    // Destination index should not be deleted when transform is deleted
    expect(esClient.transport.request.mock.calls).toEqual([]);

    // Create a @package component template and an empty @custom component template
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
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'endpoint' } },
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
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'endpoint' } },
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

    // Destination index is not created before transform is created
    expect(esClient.indices.create.mock.calls).toEqual([]);

    expect(esClient.transform.putTransform.mock.calls).toEqual([[expectedData.TRANSFORM]]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'logs-endpoint.metadata_current-default-0.2.0',
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
              id: '.metrics-endpoint.metadata_united_default',
              type: ElasticsearchAssetType.index,
            },
            {
              id: 'logs-endpoint.metadata_current-template',
              type: ElasticsearchAssetType.indexTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@custom',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@package',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-default-0.2.0',
              type: ElasticsearchAssetType.transform,
              version: '0.2.0',
            },
          ],
        },
        {
          refresh: false,
        },
      ],
      // After transforms are installed, es asset reference needs to be updated if they are deferred or not
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
              id: '.metrics-endpoint.metadata_united_default',
              type: ElasticsearchAssetType.index,
            },
            {
              id: 'logs-endpoint.metadata_current-template',
              type: ElasticsearchAssetType.indexTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@custom',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@package',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              // After transforms are installed, es asset reference needs to be updated if they are deferred or not
              deferred: false,
              id: 'logs-endpoint.metadata_current-default-0.2.0',
              type: ElasticsearchAssetType.transform,
              version: '0.2.0',
            },
          ],
        },
        {
          refresh: false,
        },
      ],
    ]);
  });

  test('can install new versions and removes older version when upgraded from old json schema to new yml schema', async () => {
    const sourceData = getYamlTestData(undefined, '0.2.0');
    const expectedData = getExpectedData('0.2.0');

    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.policy-0.1.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.1.0',
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
          id: 'logs-endpoint.metadata_current-default-0.2.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'logs-endpoint.metadata_current-default-0.2.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
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

    await installTransforms({
      installablePackage: {
        name: 'endpoint',
        version: '0.16.0-dev.0',
      } as unknown as RegistryPackage,
      paths: [
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/fields/fields.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/manifest.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/transform.yml',
      ],
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
    });

    // Stop and delete previously installed transforms
    expect(esClient.transform.stopTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.1.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);
    expect(esClient.transform.deleteTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'endpoint.metadata_current-default-0.1.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);

    // Destination index from previous version using legacy schema should be deleted
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
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'endpoint' } },
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
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'endpoint' } },
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

    // Destination index is not created before transform is created
    expect(esClient.indices.create.mock.calls).toEqual([]);

    expect(esClient.transform.putTransform.mock.calls).toEqual([[expectedData.TRANSFORM]]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'logs-endpoint.metadata_current-default-0.2.0',
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
              id: 'metrics-endpoint.policy-0.1.0-dev.0',
              type: ElasticsearchAssetType.ingestPipeline,
            },
            {
              id: '.metrics-endpoint.metadata_united_default',
              type: ElasticsearchAssetType.index,
            },
            {
              id: 'logs-endpoint.metadata_current-template',
              type: ElasticsearchAssetType.indexTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@custom',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@package',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-default-0.2.0',
              type: ElasticsearchAssetType.transform,
              version: '0.2.0',
            },
          ],
        },
        {
          refresh: false,
        },
      ],
      [
        'epm-packages',
        'endpoint',
        {
          installed_es: [
            {
              id: 'metrics-endpoint.policy-0.1.0-dev.0',
              type: ElasticsearchAssetType.ingestPipeline,
            },
            {
              id: '.metrics-endpoint.metadata_united_default',
              type: ElasticsearchAssetType.index,
            },
            {
              id: 'logs-endpoint.metadata_current-template',
              type: ElasticsearchAssetType.indexTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@custom',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@package',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              // After transforms are installed, es asset reference needs to be updated if they are deferred or not
              deferred: false,
              id: 'logs-endpoint.metadata_current-default-0.2.0',
              type: ElasticsearchAssetType.transform,
              version: '0.2.0',
            },
          ],
        },
        {
          refresh: false,
        },
      ],
    ]);
  });

  test('creates index and component templates even if no manifest.yml', async () => {
    // Old fleet_transform_version is 0.1.0, fleet_transform_version to be installed is 0.1.0
    const sourceData = getYamlTestData(false, '0.2.0');
    const expectedData = getExpectedData('0.2.0');

    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.policy-0.16.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'logs-endpoint.metadata_current-default-0.1.0',
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
          id: 'logs-endpoint.metadata_current-default-0.2.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'logs-endpoint.metadata_current-default-0.2.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
    } as unknown as Installation;
    (getAsset as jest.MockedFunction<typeof getAsset>)
      .mockReturnValueOnce(Buffer.from(sourceData.FIELDS, 'utf8'))
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

    await installTransforms({
      installablePackage: {
        name: 'endpoint',
        version: '0.16.0-dev.0',
      } as unknown as RegistryPackage,
      paths: [
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/fields/fields.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/transform.yml',
      ],
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
    });

    // Stop and delete previously installed transforms
    expect(esClient.transform.stopTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'logs-endpoint.metadata_current-default-0.1.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);
    expect(esClient.transform.deleteTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'logs-endpoint.metadata_current-default-0.1.0',
          force: true,
        },
        { ignore: [404] },
      ],
    ]);

    // Destination index should not be deleted when transform is deleted
    expect(esClient.transport.request.mock.calls).toEqual([]);

    // Create a @package component template and an empty @custom component template
    expect(esClient.cluster.putComponentTemplate.mock.calls).toEqual([
      [
        {
          name: 'logs-endpoint.metadata_current-template@package',
          body: {
            template: {
              settings: { index: { mapping: { total_fields: { limit: '10000' } } } },
              mappings: { properties: { '@timestamp': { type: 'date' } } },
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
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'endpoint' } },
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

    // Destination index is not created before transform is created
    expect(esClient.indices.create.mock.calls).toEqual([]);

    expect(esClient.transform.putTransform.mock.calls).toEqual([[expectedData.TRANSFORM]]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([
      [
        {
          transform_id: 'logs-endpoint.metadata_current-default-0.2.0',
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
              id: '.metrics-endpoint.metadata_united_default',
              type: ElasticsearchAssetType.index,
            },
            {
              id: 'logs-endpoint.metadata_current-template',
              type: ElasticsearchAssetType.indexTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@custom',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@package',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-default-0.2.0',
              type: ElasticsearchAssetType.transform,
              version: '0.2.0',
            },
          ],
        },
        {
          refresh: false,
        },
      ],
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
              id: '.metrics-endpoint.metadata_united_default',
              type: ElasticsearchAssetType.index,
            },
            {
              id: 'logs-endpoint.metadata_current-template',
              type: ElasticsearchAssetType.indexTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@custom',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              id: 'logs-endpoint.metadata_current-template@package',
              type: ElasticsearchAssetType.componentTemplate,
              version: '0.2.0',
            },
            {
              deferred: false,
              id: 'logs-endpoint.metadata_current-default-0.2.0',
              type: ElasticsearchAssetType.transform,
              version: '0.2.0',
            },
          ],
        },
        {
          refresh: false,
        },
      ],
    ]);
  });

  test('can install new version when an older version does not exist', async () => {
    const sourceData = getYamlTestData(false, '0.2.0');
    const expectedData = getExpectedData('0.2.0');

    const previousInstallation: Installation = {
      installed_es: [],
    } as unknown as Installation;

    const currentInstallation: Installation = {
      installed_es: [
        {
          id: `logs-endpoint.metadata_current-default-0.2.0`,
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
        attributes: { installed_es: [] },
      } as unknown as SavedObject<Installation>)
    );

    await installTransforms({
      installablePackage: {
        name: 'endpoint',
        version: '0.16.0-dev.0',
      } as unknown as RegistryPackage,
      paths: [
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/manifest.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/transform.yml',
      ],
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
      authorizationHeader,
    });

    expect(esClient.transform.putTransform.mock.calls).toEqual([[expectedData.TRANSFORM]]);
    // Does not start transform because start is set to false in manifest.yml
    expect(esClient.transform.startTransform.mock.calls).toEqual([]);
  });

  test('can downgrade to older version when force: true', async () => {
    const sourceData = getYamlTestData(false, '0.1.0');
    const expectedData = getExpectedData('0.1.0');

    const previousInstallation: Installation = {
      installed_es: [
        {
          id: `logs-endpoint.metadata_current-default-0.2.0`,
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
      installed_es: [
        {
          id: `logs-endpoint.metadata_current-default-0.1.0`,
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
        attributes: { installed_es: [] },
      } as unknown as SavedObject<Installation>)
    );

    // Mock resp for when index from older version already exists
    esClient.indices.create.mockReturnValueOnce(
      // @ts-expect-error mock error instead of successful IndicesCreateResponse
      Promise.resolve({
        error: {
          type: 'resource_already_exists_exception',
        },
        status: 400,
      })
    );

    await installTransforms({
      installablePackage: {
        name: 'endpoint',
        version: '0.16.0-dev.0',
      } as unknown as RegistryPackage,
      paths: [
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/manifest.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/transform.yml',
      ],
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
    });

    expect(esClient.indices.create.mock.calls).toEqual([]);

    // If downgrading to and older version, and destination index already exists
    // aliases should still be updated to point .latest to this index
    expect(esClient.indices.updateAliases.mock.calls).toEqual([]);

    expect(esClient.transform.deleteTransform.mock.calls).toEqual([
      [
        { force: true, transform_id: 'logs-endpoint.metadata_current-default-0.2.0' },
        { ignore: [404] },
      ],
    ]);
    expect(esClient.transform.putTransform.mock.calls).toEqual([[expectedData.TRANSFORM]]);
  });

  test('retain old transforms and do nothing if fleet_transform_version is the same', async () => {
    // Old fleet_transform_version is 0.1.0, fleet_transform_version to be installed is 0.1.0
    const sourceData = getYamlTestData(false, '0.1.0');

    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'logs-endpoint.metadata_current-default-0.1.0',
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
      installed_es: [
        {
          id: 'endpoint.metadata-current-default-0.1.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
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

    await installTransforms({
      installablePackage: {
        name: 'endpoint',
        version: '0.16.0-dev.0',
      } as unknown as RegistryPackage,
      paths: [
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/fields/fields.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/manifest.yml',
        'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/transform.yml',
      ],
      esClient,
      savedObjectsClient,
      logger: loggerMock.create(),
      esReferences: previousInstallation.installed_es,
    });

    // Transform from old version is neither stopped nor deleted
    expect(esClient.transform.stopTransform.mock.calls).toEqual([]);
    expect(esClient.transform.deleteTransform.mock.calls).toEqual([]);

    // Destination index from old version is not deleted
    expect(esClient.transport.request.mock.calls).toEqual([]);

    // No new destination index is created
    expect(esClient.indices.create.mock.calls).toEqual([]);
    // No new transform is created or started
    expect(esClient.transform.putTransform.mock.calls).toEqual([]);
    expect(esClient.transform.startTransform.mock.calls).toEqual([]);
  });
});

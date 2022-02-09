/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';
import {
  ClusterClientAdapter,
  IClusterClientAdapter,
  EVENT_BUFFER_LENGTH,
} from './cluster_client_adapter';
import { findOptionsSchema } from '../event_log_client';
import { delay } from '../lib/delay';
import { times } from 'lodash';
import { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { TransportResult } from '@elastic/elasticsearch';

type MockedLogger = ReturnType<typeof loggingSystemMock['createLogger']>;

let logger: MockedLogger;
let clusterClient: DeeplyMockedKeys<ElasticsearchClient>;
let clusterClientAdapter: IClusterClientAdapter;

beforeEach(() => {
  logger = loggingSystemMock.createLogger();
  clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  clusterClientAdapter = new ClusterClientAdapter({
    logger,
    elasticsearchClientPromise: Promise.resolve(clusterClient),
    wait: () => Promise.resolve(true),
  });
});

describe('indexDocument', () => {
  test('should call cluster client bulk with given doc', async () => {
    clusterClientAdapter.indexDocument({ body: { message: 'foo' }, index: 'event-log' });

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length !== 0;
    });

    expect(clusterClient.bulk).toHaveBeenCalledWith({
      body: [{ create: { _index: 'event-log' } }, { message: 'foo' }],
    });
  });

  test('should log an error when cluster client throws an error', async () => {
    clusterClient.bulk.mockRejectedValue(new Error('expected failure'));
    clusterClientAdapter.indexDocument({ body: { message: 'foo' }, index: 'event-log' });
    await retryUntil('cluster client bulk called', () => {
      return logger.error.mock.calls.length !== 0;
    });

    const expectedMessage = `error writing bulk events: "expected failure"; docs: [{"create":{"_index":"event-log"}},{"message":"foo"}]`;
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });
});

describe('shutdown()', () => {
  test('should work if no docs have been written', async () => {
    const result = await clusterClientAdapter.shutdown();
    expect(result).toBeFalsy();
  });

  test('should work if some docs have been written', async () => {
    clusterClientAdapter.indexDocument({ body: { message: 'foo' }, index: 'event-log' });
    const resultPromise = clusterClientAdapter.shutdown();

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length !== 0;
    });

    const result = await resultPromise;
    expect(result).toBeFalsy();
  });
});

describe('buffering documents', () => {
  test('should write buffered docs after timeout', async () => {
    // write EVENT_BUFFER_LENGTH - 1 docs
    for (let i = 0; i < EVENT_BUFFER_LENGTH - 1; i++) {
      clusterClientAdapter.indexDocument({ body: { message: `foo ${i}` }, index: 'event-log' });
    }

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length !== 0;
    });

    const expectedBody = [];
    for (let i = 0; i < EVENT_BUFFER_LENGTH - 1; i++) {
      expectedBody.push({ create: { _index: 'event-log' } }, { message: `foo ${i}` });
    }

    expect(clusterClient.bulk).toHaveBeenCalledWith({
      body: expectedBody,
    });
  });

  test('should write buffered docs after buffer exceeded', async () => {
    // write EVENT_BUFFER_LENGTH + 1 docs
    for (let i = 0; i < EVENT_BUFFER_LENGTH + 1; i++) {
      clusterClientAdapter.indexDocument({ body: { message: `foo ${i}` }, index: 'event-log' });
    }

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length >= 2;
    });

    const expectedBody = [];
    for (let i = 0; i < EVENT_BUFFER_LENGTH; i++) {
      expectedBody.push({ create: { _index: 'event-log' } }, { message: `foo ${i}` });
    }

    expect(clusterClient.bulk).toHaveBeenNthCalledWith(1, {
      body: expectedBody,
    });

    expect(clusterClient.bulk).toHaveBeenNthCalledWith(2, {
      body: [{ create: { _index: 'event-log' } }, { message: `foo 100` }],
    });
  });

  test('should handle lots of docs correctly with a delay in the bulk index', async () => {
    // @ts-ignore
    clusterClient.bulk.mockImplementation = async () => await delay(100);

    const docs = times(EVENT_BUFFER_LENGTH * 10, (i) => ({
      body: { message: `foo ${i}` },
      index: 'event-log',
    }));

    // write EVENT_BUFFER_LENGTH * 10 docs
    for (const doc of docs) {
      clusterClientAdapter.indexDocument(doc);
    }

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.bulk.mock.calls.length >= 10;
    });

    for (let i = 0; i < 10; i++) {
      const expectedBody = [];
      for (let j = 0; j < EVENT_BUFFER_LENGTH; j++) {
        expectedBody.push(
          { create: { _index: 'event-log' } },
          { message: `foo ${i * EVENT_BUFFER_LENGTH + j}` }
        );
      }

      expect(clusterClient.bulk).toHaveBeenNthCalledWith(i + 1, {
        body: expectedBody,
      });
    }
  });
});

describe('doesIlmPolicyExist', () => {
  // ElasticsearchError can be a bit random in shape, we need an any here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notFoundError = new Error('Not found') as any;
  notFoundError.statusCode = 404;

  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesIlmPolicyExist('foo');
    expect(clusterClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_ilm/policy/foo',
    });
  });

  test('should return false when 404 error is returned by Elasticsearch', async () => {
    clusterClient.transport.request.mockRejectedValue(notFoundError);
    await expect(clusterClientAdapter.doesIlmPolicyExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when error is not 404', async () => {
    clusterClient.transport.request.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesIlmPolicyExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error checking existance of ilm policy: Fail"`);
  });

  test('should return true when no error is thrown', async () => {
    await expect(clusterClientAdapter.doesIlmPolicyExist('foo')).resolves.toEqual(true);
  });
});

describe('createIlmPolicy', () => {
  test('should call cluster client with given policy', async () => {
    clusterClient.transport.request.mockResolvedValue(asApiResponse({ success: true }));
    await clusterClientAdapter.createIlmPolicy('foo', { args: true });
    expect(clusterClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_ilm/policy/foo',
      body: { args: true },
    });
  });

  test('should throw error when call cluster client throws', async () => {
    clusterClient.transport.request.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.createIlmPolicy('foo', { args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating ilm policy: Fail"`);
  });
});

describe('doesIndexTemplateExist', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesIndexTemplateExist('foo');
    expect(clusterClient.indices.existsTemplate).toHaveBeenCalledWith({
      name: 'foo',
    });
  });

  test('should return true when call cluster to legacy template API returns true', async () => {
    clusterClient.indices.existsTemplate.mockResolvedValue(asApiResponse(true));
    clusterClient.indices.existsIndexTemplate.mockResolvedValue(asApiResponse(false));
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(true);
  });

  test('should return true when call cluster to index template API returns true', async () => {
    clusterClient.indices.existsTemplate.mockResolvedValue(asApiResponse(false));
    clusterClient.indices.existsIndexTemplate.mockResolvedValue(asApiResponse(true));
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(true);
  });

  test('should return false when both call cluster calls returns false', async () => {
    clusterClient.indices.existsTemplate.mockResolvedValue(asApiResponse(false));
    clusterClient.indices.existsIndexTemplate.mockResolvedValue(asApiResponse(false));
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when call cluster to legacy template API throws an error', async () => {
    clusterClient.indices.existsTemplate.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesIndexTemplateExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error checking existence of index template: Fail"`
    );
  });

  test('should throw error when call cluster to index template API throws an error', async () => {
    clusterClient.indices.existsIndexTemplate.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesIndexTemplateExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error checking existence of index template: Fail"`
    );
  });
});

describe('createIndexTemplate', () => {
  test('should call cluster with given template', async () => {
    await clusterClientAdapter.createIndexTemplate('foo', { args: true });
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith({
      name: 'foo',
      create: true,
      body: { args: true },
    });
  });

  test(`should throw error if index template still doesn't exist after error is thrown`, async () => {
    clusterClient.indices.putIndexTemplate.mockRejectedValueOnce(new Error('Fail'));
    clusterClient.indices.existsTemplate.mockResolvedValueOnce(asApiResponse(false));
    clusterClient.indices.existsIndexTemplate.mockResolvedValueOnce(asApiResponse(false));
    await expect(
      clusterClientAdapter.createIndexTemplate('foo', { args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating index template: Fail"`);
  });

  test('should not throw error if index template exists after error is thrown', async () => {
    clusterClient.indices.putIndexTemplate.mockRejectedValueOnce(new Error('Fail'));
    clusterClient.indices.existsTemplate.mockResolvedValueOnce(asApiResponse(true));
    await clusterClientAdapter.createIndexTemplate('foo', { args: true });
  });
});

describe('getExistingLegacyIndexTemplates', () => {
  test('should call cluster with given index template pattern', async () => {
    await clusterClientAdapter.getExistingLegacyIndexTemplates('foo*');
    expect(clusterClient.indices.getTemplate).toHaveBeenCalledWith(
      {
        name: 'foo*',
      },
      { ignore: [404] }
    );
  });

  test('should return templates when found', async () => {
    const response = {
      'foo-bar-template': {
        order: 0,
        index_patterns: ['foo-bar-*'],
        settings: { index: { number_of_shards: '1' } },
        mappings: { dynamic: false, properties: {} },
        aliases: {},
      },
    };
    clusterClient.indices.getTemplate.mockResolvedValue(
      asApiResponse<estypes.IndicesGetTemplateResponse>(response)
    );
    await expect(clusterClientAdapter.getExistingLegacyIndexTemplates('foo*')).resolves.toEqual(
      response
    );
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.getTemplate.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.getExistingLegacyIndexTemplates('foo*')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error getting existing legacy index templates: Fail"`
    );
  });
});

describe('setLegacyIndexTemplateToHidden', () => {
  test('should call cluster with given index template name and template', async () => {
    const currentTemplate = {
      order: 0,
      index_patterns: ['foo-bar-*'],
      settings: { index: { number_of_shards: '1' } },
      mappings: { dynamic: false, properties: {} },
      aliases: {},
    };
    await clusterClientAdapter.setLegacyIndexTemplateToHidden('foo-bar-template', currentTemplate);
    expect(clusterClient.indices.putTemplate).toHaveBeenCalledWith({
      name: 'foo-bar-template',
      body: {
        order: 0,
        index_patterns: ['foo-bar-*'],
        settings: { index: { number_of_shards: '1' }, 'index.hidden': true },
        mappings: { dynamic: false, properties: {} },
        aliases: {},
      },
    });
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.putTemplate.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.setLegacyIndexTemplateToHidden('foo-bar-template', {
        aliases: {},
        index_patterns: [],
        mappings: {},
        order: 0,
        settings: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error setting existing legacy index template foo-bar-template to hidden: Fail"`
    );
  });
});

describe('getExistingIndices', () => {
  test('should call cluster with given index pattern', async () => {
    await clusterClientAdapter.getExistingIndices('foo*');
    expect(clusterClient.indices.getSettings).toHaveBeenCalledWith(
      {
        index: 'foo*',
      },
      { ignore: [404] }
    );
  });

  test('should return indices when found', async () => {
    const response = {
      'foo-bar-000001': {
        settings: {
          index: {
            number_of_shards: 1,
            uuid: 'Ure4d9edQbCMtcmyy0ObrA',
          },
        },
      },
    };
    clusterClient.indices.getSettings.mockResolvedValue(
      asApiResponse<estypes.IndicesGetSettingsResponse>(response)
    );
    await expect(clusterClientAdapter.getExistingIndices('foo*')).resolves.toEqual(response);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.getSettings.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.getExistingIndices('foo*')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error getting existing indices matching pattern foo*: Fail"`
    );
  });
});

describe('setIndexToHidden', () => {
  test('should call cluster with given index name', async () => {
    await clusterClientAdapter.setIndexToHidden('foo-bar-000001');
    expect(clusterClient.indices.putSettings).toHaveBeenCalledWith({
      index: 'foo-bar-000001',
      body: {
        'index.hidden': true,
      },
    });
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.putSettings.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.setIndexToHidden('foo-bar-000001')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error setting existing index foo-bar-000001 to hidden: Fail"`
    );
  });
});

describe('getExistingIndexAliases', () => {
  test('should call cluster with given index pattern', async () => {
    await clusterClientAdapter.getExistingIndexAliases('foo*');
    expect(clusterClient.indices.getAlias).toHaveBeenCalledWith(
      {
        index: 'foo*',
      },
      { ignore: [404] }
    );
  });

  test('should return aliases when found', async () => {
    const response = {
      'foo-bar-000001': {
        aliases: {
          'foo-bar': {
            is_write_index: true,
          },
        },
      },
    };
    clusterClient.indices.getAlias.mockResolvedValue(
      asApiResponse<estypes.IndicesGetAliasResponse>(response)
    );
    await expect(clusterClientAdapter.getExistingIndexAliases('foo*')).resolves.toEqual(response);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.getAlias.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.getExistingIndexAliases('foo*')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error getting existing index aliases matching pattern foo*: Fail"`
    );
  });
});

describe('setIndexAliasToHidden', () => {
  test('should call cluster with given index name and aliases', async () => {
    await clusterClientAdapter.setIndexAliasToHidden('foo-bar', [
      { alias: 'foo-bar', indexName: 'foo-bar-000001', is_write_index: true },
    ]);
    expect(clusterClient.indices.updateAliases).toHaveBeenCalledWith({
      body: {
        actions: [
          {
            add: {
              index: 'foo-bar-000001',
              alias: 'foo-bar',
              is_hidden: true,
              is_write_index: true,
            },
          },
        ],
      },
    });
  });

  test('should update multiple indices for an alias at once and preserve existing alias settings', async () => {
    await clusterClientAdapter.setIndexAliasToHidden('foo-bar', [
      { alias: 'foo-bar', indexName: 'foo-bar-000001', is_write_index: true },
      { alias: 'foo-bar', indexName: 'foo-bar-000002', index_routing: 'index', routing: 'route' },
    ]);
    expect(clusterClient.indices.updateAliases).toHaveBeenCalledWith({
      body: {
        actions: [
          {
            add: {
              index: 'foo-bar-000001',
              alias: 'foo-bar',
              is_hidden: true,
              is_write_index: true,
            },
          },
          {
            add: {
              index: 'foo-bar-000002',
              alias: 'foo-bar',
              is_hidden: true,
              index_routing: 'index',
              routing: 'route',
            },
          },
        ],
      },
    });
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.updateAliases.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.setIndexAliasToHidden('foo-bar', [
        { alias: 'foo-bar', indexName: 'foo-bar-000001', is_write_index: true },
      ])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error setting existing index aliases for alias foo-bar to is_hidden: Fail"`
    );
  });
});

describe('doesAliasExist', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesAliasExist('foo');
    expect(clusterClient.indices.existsAlias).toHaveBeenCalledWith({
      name: 'foo',
    });
  });

  test('should return true when call cluster returns true', async () => {
    clusterClient.indices.existsAlias.mockResolvedValueOnce(asApiResponse(true));
    await expect(clusterClientAdapter.doesAliasExist('foo')).resolves.toEqual(true);
  });

  test('should return false when call cluster returns false', async () => {
    clusterClient.indices.existsAlias.mockResolvedValueOnce(asApiResponse(false));
    await expect(clusterClientAdapter.doesAliasExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.indices.existsAlias.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesAliasExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error checking existance of initial index: Fail"`
    );
  });
});

describe('createIndex', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.createIndex('foo');
    expect(clusterClient.indices.create).toHaveBeenCalledWith({
      index: 'foo',
      body: {},
    });
  });

  test('should throw error when not getting an error of type resource_already_exists_exception', async () => {
    clusterClient.indices.create.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.createIndex('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating initial index: Fail"`);
  });

  test(`shouldn't throw when an error of type resource_already_exists_exception is thrown`, async () => {
    // ElasticsearchError can be a bit random in shape, we need an any here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = new Error('Already exists') as any;
    err.body = {
      error: {
        type: 'resource_already_exists_exception',
      },
    };
    clusterClient.indices.create.mockRejectedValue(err);
    await clusterClientAdapter.createIndex('foo');
  });
});

describe('queryEventsBySavedObject', () => {
  const DEFAULT_OPTIONS = findOptionsSchema.validate({});

  test('should call cluster with proper arguments with non-default namespace', async () => {
    clusterClient.search.mockResolvedValue(
      asApiResponse({
        hits: {
          hits: [],
          total: { relation: 'eq', value: 0 },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          successful: 0,
          total: 0,
          skipped: 0,
        },
      })
    );
    await clusterClientAdapter.queryEventsBySavedObjects({
      index: 'index-name',
      namespace: 'namespace',
      type: 'saved-object-type',
      ids: ['saved-object-id'],
      findOptions: DEFAULT_OPTIONS,
    });

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toMatchInlineSnapshot(
      {
        body: {
          from: 0,
          query: {
            bool: {
              filter: [],
              must: [
                {
                  nested: {
                    path: 'kibana.saved_objects',
                    query: {
                      bool: {
                        must: [
                          {
                            term: {
                              'kibana.saved_objects.rel': {
                                value: 'primary',
                              },
                            },
                          },
                          {
                            term: {
                              'kibana.saved_objects.type': {
                                value: 'saved-object-type',
                              },
                            },
                          },
                          {
                            term: {
                              'kibana.saved_objects.namespace': {
                                value: 'namespace',
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          must: [
                            {
                              nested: {
                                path: 'kibana.saved_objects',
                                query: {
                                  bool: {
                                    must: [
                                      {
                                        terms: {
                                          'kibana.saved_objects.id': ['saved-object-id'],
                                        },
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                            {
                              range: {
                                'kibana.version': {
                                  gte: '8.0.0',
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          size: 10,
          sort: [
            {
              '@timestamp': {
                order: 'asc',
              },
            },
          ],
        },
        index: 'index-name',
        track_total_hits: true,
      },
      `
      Object {
        "body": Object {
          "from": 0,
          "query": Object {
            "bool": Object {
              "filter": Array [],
              "must": Array [
                Object {
                  "nested": Object {
                    "path": "kibana.saved_objects",
                    "query": Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "term": Object {
                              "kibana.saved_objects.rel": Object {
                                "value": "primary",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.type": Object {
                                "value": "saved-object-type",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.namespace": Object {
                                "value": "namespace",
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                Object {
                  "bool": Object {
                    "should": Array [
                      Object {
                        "bool": Object {
                          "must": Array [
                            Object {
                              "nested": Object {
                                "path": "kibana.saved_objects",
                                "query": Object {
                                  "bool": Object {
                                    "must": Array [
                                      Object {
                                        "terms": Object {
                                          "kibana.saved_objects.id": Array [
                                            "saved-object-id",
                                          ],
                                        },
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                            Object {
                              "range": Object {
                                "kibana.version": Object {
                                  "gte": "8.0.0",
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          "size": 10,
          "sort": Array [
            Object {
              "@timestamp": Object {
                "order": "asc",
              },
            },
          ],
        },
        "index": "index-name",
        "track_total_hits": true,
      }
    `
    );
  });

  test('should call cluster with proper arguments with default namespace', async () => {
    clusterClient.search.mockResolvedValue(
      asApiResponse({
        hits: {
          hits: [],
          total: { relation: 'eq', value: 0 },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          successful: 0,
          total: 0,
          skipped: 0,
        },
      })
    );
    await clusterClientAdapter.queryEventsBySavedObjects({
      index: 'index-name',
      namespace: undefined,
      type: 'saved-object-type',
      ids: ['saved-object-id'],
      findOptions: DEFAULT_OPTIONS,
    });

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toMatchObject({
      body: {
        from: 0,
        query: {
          bool: {
            filter: [],
            must: [
              {
                nested: {
                  path: 'kibana.saved_objects',
                  query: {
                    bool: {
                      must: [
                        {
                          term: {
                            'kibana.saved_objects.rel': {
                              value: 'primary',
                            },
                          },
                        },
                        {
                          term: {
                            'kibana.saved_objects.type': {
                              value: 'saved-object-type',
                            },
                          },
                        },
                        {
                          bool: {
                            must_not: {
                              exists: {
                                field: 'kibana.saved_objects.namespace',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must: [
                          {
                            nested: {
                              path: 'kibana.saved_objects',
                              query: {
                                bool: {
                                  must: [
                                    {
                                      terms: {
                                        'kibana.saved_objects.id': ['saved-object-id'],
                                      },
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          {
                            range: {
                              'kibana.version': {
                                gte: '8.0.0',
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        size: 10,
        sort: [
          {
            '@timestamp': {
              order: 'asc',
            },
          },
        ],
      },
      index: 'index-name',
      track_total_hits: true,
    });
  });

  test('should call cluster with sort', async () => {
    clusterClient.search.mockResolvedValue(
      asApiResponse({
        hits: {
          hits: [],
          total: { relation: 'eq', value: 0 },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          successful: 0,
          total: 0,
          skipped: 0,
        },
      })
    );
    await clusterClientAdapter.queryEventsBySavedObjects({
      index: 'index-name',
      namespace: 'namespace',
      type: 'saved-object-type',
      ids: ['saved-object-id'],
      findOptions: { ...DEFAULT_OPTIONS, sort_field: 'event.end', sort_order: 'desc' },
    });

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toMatchObject({
      index: 'index-name',
      body: {
        sort: [{ 'event.end': { order: 'desc' } }],
      },
    });
  });

  test('supports open ended date', async () => {
    clusterClient.search.mockResolvedValue(
      asApiResponse({
        hits: {
          hits: [],
          total: { relation: 'eq', value: 0 },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          successful: 0,
          total: 0,
          skipped: 0,
        },
      })
    );

    const start = '2020-07-08T00:52:28.350Z';

    await clusterClientAdapter.queryEventsBySavedObjects({
      index: 'index-name',
      namespace: 'namespace',
      type: 'saved-object-type',
      ids: ['saved-object-id'],
      findOptions: { ...DEFAULT_OPTIONS, start },
    });

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toMatchObject({
      body: {
        from: 0,
        query: {
          bool: {
            filter: [],
            must: [
              {
                nested: {
                  path: 'kibana.saved_objects',
                  query: {
                    bool: {
                      must: [
                        {
                          term: {
                            'kibana.saved_objects.rel': {
                              value: 'primary',
                            },
                          },
                        },
                        {
                          term: {
                            'kibana.saved_objects.type': {
                              value: 'saved-object-type',
                            },
                          },
                        },
                        {
                          term: {
                            'kibana.saved_objects.namespace': {
                              value: 'namespace',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must: [
                          {
                            nested: {
                              path: 'kibana.saved_objects',
                              query: {
                                bool: {
                                  must: [
                                    {
                                      terms: {
                                        'kibana.saved_objects.id': ['saved-object-id'],
                                      },
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          {
                            range: {
                              'kibana.version': {
                                gte: '8.0.0',
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: '2020-07-08T00:52:28.350Z',
                  },
                },
              },
            ],
          },
        },
        size: 10,
        sort: [
          {
            '@timestamp': {
              order: 'asc',
            },
          },
        ],
      },
      index: 'index-name',
      track_total_hits: true,
    });
  });

  test('supports optional date range', async () => {
    clusterClient.search.mockResolvedValue(
      asApiResponse({
        hits: {
          hits: [],
          total: { relation: 'eq', value: 0 },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          successful: 0,
          total: 0,
          skipped: 0,
        },
      })
    );

    const start = '2020-07-08T00:52:28.350Z';
    const end = '2020-07-08T00:00:00.000Z';

    await clusterClientAdapter.queryEventsBySavedObjects({
      index: 'index-name',
      namespace: 'namespace',
      type: 'saved-object-type',
      ids: ['saved-object-id'],
      findOptions: { ...DEFAULT_OPTIONS, start, end },
      legacyIds: ['legacy-id'],
    });

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toMatchObject({
      body: {
        from: 0,
        query: {
          bool: {
            filter: [],
            must: [
              {
                nested: {
                  path: 'kibana.saved_objects',
                  query: {
                    bool: {
                      must: [
                        {
                          term: {
                            'kibana.saved_objects.rel': {
                              value: 'primary',
                            },
                          },
                        },
                        {
                          term: {
                            'kibana.saved_objects.type': {
                              value: 'saved-object-type',
                            },
                          },
                        },
                        {
                          term: {
                            'kibana.saved_objects.namespace': {
                              value: 'namespace',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must: [
                          {
                            nested: {
                              path: 'kibana.saved_objects',
                              query: {
                                bool: {
                                  must: [
                                    {
                                      terms: {
                                        'kibana.saved_objects.id': ['saved-object-id'],
                                      },
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          {
                            range: {
                              'kibana.version': {
                                gte: '8.0.0',
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          {
                            nested: {
                              path: 'kibana.saved_objects',
                              query: {
                                bool: {
                                  must: [
                                    {
                                      terms: {
                                        'kibana.saved_objects.id': ['legacy-id'],
                                      },
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          {
                            bool: {
                              should: [
                                {
                                  range: {
                                    'kibana.version': {
                                      lt: '8.0.0',
                                    },
                                  },
                                },
                                {
                                  bool: {
                                    must_not: {
                                      exists: {
                                        field: 'kibana.version',
                                      },
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: '2020-07-08T00:52:28.350Z',
                  },
                },
              },
              {
                range: {
                  '@timestamp': {
                    lte: '2020-07-08T00:00:00.000Z',
                  },
                },
              },
            ],
          },
        },
        size: 10,
        sort: [
          {
            '@timestamp': {
              order: 'asc',
            },
          },
        ],
      },
      index: 'index-name',
      track_total_hits: true,
    });
  });
});

type RetryableFunction = () => boolean;

const RETRY_UNTIL_DEFAULT_COUNT = 20;
const RETRY_UNTIL_DEFAULT_WAIT = 1000; // milliseconds

function asApiResponse<T>(body: T): TransportResult<T> {
  return {
    body,
  } as TransportResult<T>;
}

async function retryUntil(
  label: string,
  fn: RetryableFunction,
  count: number = RETRY_UNTIL_DEFAULT_COUNT,
  wait: number = RETRY_UNTIL_DEFAULT_WAIT
): Promise<boolean> {
  while (count > 0) {
    count--;

    if (fn()) return true;

    // eslint-disable-next-line no-console
    console.log(`attempt failed waiting for "${label}", attempts left: ${count}`);

    if (count === 0) return false;
    await delay(wait);
  }

  return false;
}

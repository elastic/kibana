/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ClusterClientAdapter,
  IClusterClientAdapter,
  EVENT_BUFFER_LENGTH,
  getQueryBody,
  FindEventsOptionsBySavedObjectFilter,
  AggregateEventsOptionsBySavedObjectFilter,
} from './cluster_client_adapter';
import { AggregateOptionsType, queryOptionsSchema } from '../event_log_client';
import { delay } from '../lib/delay';
import { pick, times } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';

type MockedLogger = ReturnType<typeof loggingSystemMock['createLogger']>;

let logger: MockedLogger;
let clusterClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
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
      body: [{ create: { _index: 'event-log', require_alias: true } }, { message: 'foo' }],
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
      expectedBody.push(
        { create: { _index: 'event-log', require_alias: true } },
        { message: `foo ${i}` }
      );
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
      expectedBody.push(
        { create: { _index: 'event-log', require_alias: true } },
        { message: `foo ${i}` }
      );
    }

    expect(clusterClient.bulk).toHaveBeenNthCalledWith(1, {
      body: expectedBody,
    });

    expect(clusterClient.bulk).toHaveBeenNthCalledWith(2, {
      body: [{ create: { _index: 'event-log', require_alias: true } }, { message: `foo 100` }],
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
          { create: { _index: 'event-log', require_alias: true } },
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
    clusterClient.transport.request.mockResolvedValue({ success: true });
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
    clusterClient.indices.existsTemplate.mockResponse(true);
    clusterClient.indices.existsIndexTemplate.mockResponse(false);
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(true);
  });

  test('should return true when call cluster to index template API returns true', async () => {
    clusterClient.indices.existsTemplate.mockResponse(false);
    clusterClient.indices.existsIndexTemplate.mockResponse(true);
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(true);
  });

  test('should return false when both call cluster calls returns false', async () => {
    clusterClient.indices.existsTemplate.mockResponse(false);
    clusterClient.indices.existsIndexTemplate.mockResponse(false);
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
    clusterClient.indices.existsTemplate.mockResponseOnce(false);
    clusterClient.indices.existsIndexTemplate.mockResponseOnce(false);
    await expect(
      clusterClientAdapter.createIndexTemplate('foo', { args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating index template: Fail"`);
  });

  test('should not throw error if index template exists after error is thrown', async () => {
    clusterClient.indices.putIndexTemplate.mockRejectedValueOnce(new Error('Fail'));
    clusterClient.indices.existsTemplate.mockResponseOnce(true);
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
    clusterClient.indices.getTemplate.mockResponse(response);
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
    clusterClient.indices.getSettings.mockResponse(response as estypes.IndicesGetSettingsResponse);
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
        index: {
          hidden: true,
        },
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
    clusterClient.indices.getAlias.mockResponse(response as estypes.IndicesGetAliasResponse);
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
    clusterClient.indices.existsAlias.mockResponse(true);
    await expect(clusterClientAdapter.doesAliasExist('foo')).resolves.toEqual(true);
  });

  test('should return false when call cluster returns false', async () => {
    clusterClient.indices.existsAlias.mockResponse(false);
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
  const DEFAULT_OPTIONS = queryOptionsSchema.validate({});

  test('should call cluster with correct options', async () => {
    clusterClient.search.mockResponse({
      hits: {
        hits: [{ _index: 'index-name-00001', _id: '1', _source: { foo: 'bar' } }],
        total: { relation: 'eq', value: 1 },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        successful: 0,
        total: 0,
        skipped: 0,
      },
    });
    const options = {
      index: 'index-name',
      namespace: 'namespace',
      type: 'saved-object-type',
      ids: ['saved-object-id'],
      findOptions: {
        ...DEFAULT_OPTIONS,
        page: 3,
        per_page: 6,
        sort: [
          { sort_field: '@timestamp', sort_order: 'asc' },
          { sort_field: 'event.end', sort_order: 'desc' },
        ],
      },
    };
    const result = await clusterClientAdapter.queryEventsBySavedObjects(options);

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toEqual({
      index: 'index-name',
      track_total_hits: true,
      body: {
        size: 6,
        from: 12,
        query: getQueryBody(logger, options, pick(options.findOptions, ['start', 'end', 'filter'])),
        sort: [{ '@timestamp': { order: 'asc' } }, { 'event.end': { order: 'desc' } }],
      },
    });
    expect(result).toEqual({
      page: 3,
      per_page: 6,
      total: 1,
      data: [{ foo: 'bar' }],
    });
  });
});

describe('aggregateEventsBySavedObject', () => {
  const DEFAULT_OPTIONS = {
    ...queryOptionsSchema.validate({}),
    aggs: {
      genericAgg: {
        term: {
          field: 'event.action',
          size: 10,
        },
      },
    },
  };

  test('should call cluster with correct options', async () => {
    clusterClient.search.mockResponse({
      aggregations: {
        genericAgg: {
          buckets: [
            {
              key: 'execute',
              doc_count: 10,
            },
            {
              key: 'execute-start',
              doc_count: 10,
            },
            {
              key: 'new-instance',
              doc_count: 2,
            },
          ],
        },
      },
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
    });
    const options: AggregateEventsOptionsBySavedObjectFilter = {
      index: 'index-name',
      namespace: 'namespace',
      type: 'saved-object-type',
      ids: ['saved-object-id'],
      aggregateOptions: DEFAULT_OPTIONS as AggregateOptionsType,
    };
    const result = await clusterClientAdapter.aggregateEventsBySavedObjects(options);

    const [query] = clusterClient.search.mock.calls[0];
    expect(query).toEqual({
      index: 'index-name',
      body: {
        size: 0,
        query: getQueryBody(
          logger,
          options,
          pick(options.aggregateOptions, ['start', 'end', 'filter'])
        ),
        aggs: {
          genericAgg: {
            term: {
              field: 'event.action',
              size: 10,
            },
          },
        },
      },
    });
    expect(result).toEqual({
      aggregations: {
        genericAgg: {
          buckets: [
            {
              key: 'execute',
              doc_count: 10,
            },
            {
              key: 'execute-start',
              doc_count: 10,
            },
            {
              key: 'new-instance',
              doc_count: 2,
            },
          ],
        },
      },
    });
  });
});

describe('getQueryBody', () => {
  const options = {
    index: 'index-name',
    namespace: undefined,
    type: 'saved-object-type',
    ids: ['saved-object-id'],
  };
  test('should correctly build query with namespace filter when namespace is undefined', () => {
    expect(getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {})).toEqual({
      bool: {
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
    });
  });

  test('should correctly build query with namespace filter when namespace is specified', () => {
    expect(
      getQueryBody(
        logger,
        { ...options, namespace: 'namespace' } as FindEventsOptionsBySavedObjectFilter,
        {}
      )
    ).toEqual({
      bool: {
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
    });
  });

  test('should correctly build query when filter is specified', () => {
    expect(
      getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {
        filter: 'event.provider: alerting AND event.action:execute',
      })
    ).toEqual({
      bool: {
        filter: {
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match: {
                        'event.provider': 'alerting',
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match: {
                        'event.action': 'execute',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
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
    });
  });

  test('should correctly build query when legacyIds are specified', () => {
    expect(
      getQueryBody(
        logger,
        { ...options, legacyIds: ['legacy-id-1'] } as FindEventsOptionsBySavedObjectFilter,
        {}
      )
    ).toEqual({
      bool: {
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
                                    'kibana.saved_objects.id': ['legacy-id-1'],
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
        ],
      },
    });
  });

  test('should correctly build query when start is specified', () => {
    expect(
      getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {
        start: '2020-07-08T00:52:28.350Z',
      })
    ).toEqual({
      bool: {
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
          {
            range: {
              '@timestamp': {
                gte: '2020-07-08T00:52:28.350Z',
              },
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when end is specified', () => {
    expect(
      getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {
        end: '2020-07-10T00:52:28.350Z',
      })
    ).toEqual({
      bool: {
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
          {
            range: {
              '@timestamp': {
                lte: '2020-07-10T00:52:28.350Z',
              },
            },
          },
        ],
      },
    });
  });

  test('should correctly build query when start and end are specified', () => {
    expect(
      getQueryBody(logger, options as FindEventsOptionsBySavedObjectFilter, {
        start: '2020-07-08T00:52:28.350Z',
        end: '2020-07-10T00:52:28.350Z',
      })
    ).toEqual({
      bool: {
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
                lte: '2020-07-10T00:52:28.350Z',
              },
            },
          },
        ],
      },
    });
  });
});

type RetryableFunction = () => boolean;

const RETRY_UNTIL_DEFAULT_COUNT = 20;
const RETRY_UNTIL_DEFAULT_WAIT = 1000; // milliseconds

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

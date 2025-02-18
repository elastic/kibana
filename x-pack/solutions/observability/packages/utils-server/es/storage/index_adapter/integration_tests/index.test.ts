/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import {
  SimpleIStorageClient,
  StorageClientBulkResponse,
  StorageClientIndexResponse,
  StorageIndexAdapter,
  type StorageSettings,
} from '../..';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import * as getSchemaVersionModule from '../../get_schema_version';
import { isResponseError } from '@kbn/es-errors';
import { IndicesGetResponse } from '@elastic/elasticsearch/lib/api/types';
import { SimpleStorageIndexAdapter } from '..';

const TEST_INDEX_NAME = 'test_index';

const createLoggerMock = (): jest.Mocked<Logger> => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  logger.get.mockReturnValue(logger);

  return logger;
};

describe('StorageIndexAdapter', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let kibanaServer: TestKibanaUtils;

  let loggerMock: jest.Mocked<Logger>;

  const storageSettings = {
    name: TEST_INDEX_NAME,
    schema: {
      properties: {
        foo: {
          type: 'keyword',
        },
      },
    },
  } satisfies StorageSettings;

  let adapter: SimpleStorageIndexAdapter<typeof storageSettings>;
  let client: SimpleIStorageClient<typeof storageSettings>;

  describe('with a clean Elasticsearch instance', () => {
    beforeAll(async () => {
      await createServers();
    });

    afterAll(async () => {
      await stopServers();
    });

    it('creates a named logger', () => {
      expect(loggerMock.get).toHaveBeenCalledWith('storage');
      expect(loggerMock.get).toHaveBeenCalledWith('test_index');
    });

    it('does not install index templates or backing indices initially', async () => {
      await verifyNoIndexTemplate();
      await verifyNoIndex();
    });

    describe('after searching', () => {
      beforeAll(async () => {
        await client
          .search({ track_total_hits: false, size: 1, query: { match_all: {} } })
          .catch((error) => {});
      });

      it('does not install index templates or backing indices', async () => {
        await verifyNoIndexTemplate();
        await verifyNoIndex();
      });

      it('does not fail a search when an index does not exist', async () => {
        expect(
          await client.search({
            track_total_hits: true,
            size: 1,
            query: { match_all: {} },
          })
        ).toMatchObject({
          hits: {
            hits: [],
            total: {
              value: 0,
              relation: 'eq',
            },
          },
        });
      });
    });
  });

  describe('when indexing into a clean Elasticsearch instance', () => {
    beforeAll(async () => {
      await createServers();
    });

    afterAll(async () => {
      await stopServers();
    });

    let indexResponse: StorageClientIndexResponse;

    beforeAll(async () => {
      indexResponse = await client.index({
        id: 'doc1',
        document: { foo: 'bar' },
      });
    });

    it('creates the resources', async () => {
      await verifyIndex();
    });

    it('returns the indexed document', async () => {
      expect(indexResponse).toMatchObject({
        _id: 'doc1',
        _shards: {
          successful: 1,
        },
        _version: 1,
        result: 'created',
      });
    });

    it('returns the document when searching', async () => {
      const searchResponse = await client.search({
        track_total_hits: true,
        size: 1,
        query: {
          bool: {
            filter: [
              {
                term: {
                  foo: 'bar',
                },
              },
            ],
          },
        },
      });

      expect(searchResponse).toMatchObject({
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          hits: [
            {
              _id: 'doc1',
              _source: {
                foo: 'bar',
              },
            },
          ],
        },
      });
    });

    it('deletes the document', async () => {
      await verifyClean();
    });

    describe('after rolling over the index manually and indexing the same document', () => {
      beforeAll(async () => {
        await verifyClean();
        await client.index({ id: 'doc1', document: { foo: 'bar' } });
        await rolloverIndex();
        await client.index({ id: 'doc1', document: { foo: 'bar' } });
      });

      it('puts the document in the new write index', async () => {
        await verifyDocumentInNewWriteIndex();
      });

      it('deletes the document from the rolled over index', async () => {
        await verifyDocumentDeletedInRolledOverIndex();
      });
    });
  });

  describe('when bulk indexing into a clean Elasticsearch instance', () => {
    beforeAll(async () => {
      await createServers();
    });

    afterAll(async () => {
      await stopServers();
    });

    let bulkIndexResponse: StorageClientBulkResponse;

    beforeAll(async () => {
      bulkIndexResponse = await client.bulk({
        operations: [
          {
            index: {
              _id: 'doc1',
              document: { foo: 'bar' },
            },
          },
        ],
      });
    });

    it('creates the resources', async () => {
      await verifyIndex();
    });

    it('returns the indexed document', async () => {
      expect(bulkIndexResponse).toMatchObject({
        errors: false,
        items: [
          {
            index: {
              _id: 'doc1',
              _shards: {
                successful: 1,
              },
              result: 'created',
              status: 201,
            },
          },
        ],
      });
    });

    it('returns the document when searching', async () => {
      const searchResponse = await client.search({
        track_total_hits: true,
        size: 1,
        query: {
          bool: {
            filter: [
              {
                term: {
                  foo: 'bar',
                },
              },
            ],
          },
        },
      });

      expect(searchResponse).toMatchObject({
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          hits: [
            {
              _id: 'doc1',
              _source: {
                foo: 'bar',
              },
            },
          ],
        },
      });
    });

    describe('after rolling over the index manually and indexing the same document', () => {
      beforeAll(async () => {
        await client.bulk({
          operations: [
            {
              index: {
                _id: 'doc1',
                document: {
                  foo: 'bar',
                },
              },
            },
          ],
        });

        await rolloverIndex();

        await client.bulk({
          operations: [
            {
              index: {
                _id: 'doc1',
                document: {
                  foo: 'bar',
                },
              },
            },
          ],
        });
      });

      it('puts the document in the new write index', async () => {
        await verifyDocumentInNewWriteIndex();
      });

      it('deletes the document from the rolled over index', async () => {
        await verifyDocumentDeletedInRolledOverIndex();
      });

      it('deletes the documents', async () => {
        await verifyClean();
      });
    });
  });

  describe('when writing/bootstrapping with an legacy index', () => {
    beforeAll(async () => {
      await createServers();

      await client.index({ id: 'foo', document: { foo: 'bar' } });

      jest.spyOn(getSchemaVersionModule, 'getSchemaVersion').mockReturnValue('next_version');

      await client.index({ id: 'foo', document: { foo: 'bar' } });
    });

    afterAll(async () => {
      await stopServers();
    });

    it('updates the existing write index in place', async () => {
      await verifyIndex({ version: 'next_version' });

      const getIndicesResponse = await esClient.indices.get({
        index: TEST_INDEX_NAME,
      });

      const indices = Object.keys(getIndicesResponse);

      const writeIndexName = `${TEST_INDEX_NAME}-000001`;

      expect(indices).toEqual([writeIndexName]);

      expect(getIndicesResponse[writeIndexName].mappings?._meta?.version).toEqual('next_version');
    });

    it('deletes the documents', async () => {
      await verifyClean();
    });
  });

  describe('when writing/bootstrapping with an existing, incompatible index', () => {
    beforeAll(async () => {
      await createServers();

      await client.index({ id: 'foo', document: { foo: 'bar' } });

      jest
        .spyOn(getSchemaVersionModule, 'getSchemaVersion')
        .mockReturnValue('incompatible_version');
    });

    afterAll(async () => {
      await stopServers();
    });

    it('fails when indexing', async () => {
      const incompatibleAdapter = createStorageIndexAdapter({
        ...storageSettings,
        schema: {
          properties: {
            foo: {
              type: 'text',
            },
          },
        },
      });

      await expect(
        async () =>
          await incompatibleAdapter.getClient().index({ id: 'foo', document: { foo: 'bar' } })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`
        "illegal_argument_exception
        	Root causes:
        		illegal_argument_exception: mapper [foo] cannot be changed from type [keyword] to [text]"
      `);
    });

    it('deletes the documents', async () => {
      await verifyClean();
    });
  });

  function createStorageIndexAdapter<TStorageSettings extends StorageSettings>(
    settings: TStorageSettings
  ): SimpleStorageIndexAdapter<TStorageSettings> {
    return new StorageIndexAdapter(esClient, loggerMock, settings);
  }

  async function createServers() {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        kbn: {
          cliArgs: {
            oss: false,
          },
        },
      },
    });

    esServer = await startES();

    jest.spyOn(getSchemaVersionModule, 'getSchemaVersion').mockReturnValue('current_version');

    kibanaServer = await startKibana();

    esClient = kibanaServer.coreStart.elasticsearch.client.asScoped(
      httpServerMock.createKibanaRequest()
    ).asCurrentUser;

    loggerMock = createLoggerMock();

    adapter = createStorageIndexAdapter(storageSettings);
    client = adapter.getClient();
  }

  async function stopServers() {
    if (kibanaServer) {
      await kibanaServer.stop();
    }

    await esServer.stop();

    jest.clearAllMocks();
  }

  async function verifyNoIndexTemplate() {
    const getIndexTemplateResponse = await esClient.indices.getIndexTemplate({
      name: '*',
    });

    expect(
      getIndexTemplateResponse.index_templates.find((indexTemplate) =>
        indexTemplate.name.startsWith(TEST_INDEX_NAME)
      )
    ).toBeUndefined();
  }

  async function verifyNoIndex() {
    const getIndexResponse = await esClient.indices
      .get({
        index: TEST_INDEX_NAME,
      })
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
          return {} as IndicesGetResponse;
        }
        throw error;
      });

    expect(getIndexResponse).toEqual({});
  }

  async function rolloverIndex() {
    await esClient.indices.updateAliases({
      actions: [
        {
          add: {
            index: `${TEST_INDEX_NAME}-000001`,
            alias: TEST_INDEX_NAME,
            is_write_index: false,
          },
        },
      ],
    });

    await esClient.indices.create({
      index: `${TEST_INDEX_NAME}-000002`,
    });
  }

  async function verifyIndex(options: { writeIndexName?: string; version?: string } = {}) {
    const { writeIndexName = `${TEST_INDEX_NAME}-000001`, version = 'current_version' } = options;

    const getIndexResponse = await esClient.indices
      .get({
        index: TEST_INDEX_NAME,
      })
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
          return {} as IndicesGetResponse;
        }
        throw error;
      });

    const indices = Object.keys(getIndexResponse);

    expect(indices).toEqual([writeIndexName]);

    expect(getIndexResponse[writeIndexName].mappings).toEqual({
      _meta: {
        version,
      },
      dynamic: 'strict',
      properties: {
        foo: {
          type: 'keyword',
        },
      },
    });

    expect(getIndexResponse[writeIndexName].aliases).toEqual({
      [TEST_INDEX_NAME]: {
        is_write_index: true,
      },
    });
  }

  async function verifyDocumentInNewWriteIndex() {
    const searchResponse = await client.search({
      track_total_hits: true,
      size: 10_000,
    });

    expect(searchResponse).toMatchObject({
      hits: {
        hits: [
          {
            _id: 'doc1',
            _index: `${TEST_INDEX_NAME}-000002`,
            _source: {
              foo: 'bar',
            },
          },
        ],
        total: {
          value: 1,
          relation: 'eq',
        },
      },
    });
  }

  async function verifyDocumentDeletedInRolledOverIndex() {
    const searchResponse = await client.search({
      track_total_hits: true,
      size: 10_000,
      query: {
        bool: {
          filter: [
            {
              term: {
                _index: `${TEST_INDEX_NAME}-000001`,
              },
            },
          ],
        },
      },
    });

    expect(searchResponse).toMatchObject({
      hits: {
        hits: [],
        total: {
          value: 0,
          relation: 'eq',
        },
      },
    });
  }

  async function verifyClean() {
    await client.clean();

    // verify that the index template is removed
    const templates = await esClient.indices
      .getIndexTemplate({
        name: TEST_INDEX_NAME,
      })
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
          return { index_templates: [] };
        }
        throw error;
      });

    expect(templates.index_templates).toEqual([]);

    // verify that the backing indices are removed
    const indices = await esClient.indices.get({
      index: `${TEST_INDEX_NAME}*`,
    });
    expect(Object.keys(indices)).toEqual([]);
  }
});

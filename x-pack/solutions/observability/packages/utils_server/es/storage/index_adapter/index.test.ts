/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  BulkDeleteOperation,
  BulkIndexOperation,
  BulkRequest,
  BulkResponseItem,
  IndexRequest,
  IndicesGetAliasIndexAliases,
  IndicesIndexState,
  IndicesPutIndexTemplateRequest,
  IndicesSimulateIndexTemplateResponse,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { castArray, merge, remove } from 'lodash';
import { Required } from 'utility-types';
import { v4 } from 'uuid';
import { StorageIndexAdapter } from '.';
import { StorageSettings } from '..';
import * as getSchemaVersionModule from '../get_schema_version';

type MockedElasticsearchClient = jest.Mocked<ElasticsearchClient> & {
  indices: jest.Mocked<ElasticsearchClient['indices']>;
};

const createEsClientMock = (): MockedElasticsearchClient => {
  return {
    indices: {
      putIndexTemplate: jest.fn(),
      getIndexTemplate: jest.fn(),
      create: jest.fn(),
      getAlias: jest.fn(),
      putAlias: jest.fn(),
      existsIndexTemplate: jest.fn(),
      existsAlias: jest.fn(),
      exists: jest.fn(),
      get: jest.fn(),
      simulateIndexTemplate: jest.fn(),
      putMapping: jest.fn(),
      putSettings: jest.fn(),
    },
    search: jest.fn(),
    bulk: jest.fn(),
    index: jest.fn(),
    delete: jest.fn(),
  } as unknown as MockedElasticsearchClient;
};

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

const TEST_INDEX_NAME = 'test_index';

function getIndexName(counter: number) {
  return `${TEST_INDEX_NAME}-00000${counter.toString()}`;
}

describe('StorageIndexAdapter', () => {
  let esClientMock: MockedElasticsearchClient;
  let loggerMock: jest.Mocked<Logger>;
  let adapter: StorageIndexAdapter<typeof storageSettings>;

  const storageSettings = {
    name: TEST_INDEX_NAME,
    schema: {
      properties: {
        foo: {
          type: 'keyword',
          required: true,
        },
      },
    },
  } satisfies StorageSettings;

  beforeEach(() => {
    esClientMock = createEsClientMock();
    loggerMock = createLoggerMock();

    adapter = new StorageIndexAdapter(esClientMock, loggerMock, storageSettings);

    mockEmptyState();

    mockCreateAPIs();

    jest.spyOn(getSchemaVersionModule, 'getSchemaVersion').mockReturnValue('current_version');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a named logger', () => {
    expect(loggerMock.get).toHaveBeenCalledWith('storage');
    expect(loggerMock.get).toHaveBeenCalledWith('test_index');
  });

  it('does not install index templates or backing indices initially', () => {
    expect(esClientMock.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClientMock.indices.create).not.toHaveBeenCalled();
  });

  it('does not install index templates or backing indices after searching', async () => {
    const mockSearchResponse = {
      hits: {
        hits: [{ _id: 'doc1', _source: { foo: 'bar' } }],
      },
    } as unknown as SearchResponse<{ foo: 'bar' }>;

    esClientMock.search.mockResolvedValueOnce(mockSearchResponse);

    await adapter.search({ query: { match_all: {} } });

    expect(esClientMock.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClientMock.indices.create).not.toHaveBeenCalled();
  });

  it('does not fail a search when an index does not exist', async () => {
    const mockSearchResponse = {
      hits: {
        hits: [],
      },
    } as unknown as SearchResponse<unknown>;

    esClientMock.search.mockResolvedValueOnce(mockSearchResponse);

    await adapter.search({ query: { match_all: {} } });

    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        allow_no_indices: true,
      })
    );
  });

  describe('when writing/bootstrapping without an existing index', () => {
    function verifyResources() {
      expect(esClientMock.indices.putIndexTemplate).toHaveBeenCalled();
      expect(esClientMock.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'test_index-000001',
        })
      );
    }

    describe('when using index', () => {
      it('creates the resources', async () => {
        await adapter.index({ id: 'doc1', document: { foo: 'bar' } });

        verifyResources();

        expect(esClientMock.index).toHaveBeenCalledTimes(1);
      });
    });

    describe('when using bulk', () => {
      it('creates the resources', async () => {
        await adapter.bulk({
          operations: [{ index: { _id: 'foo' } }, { foo: 'bar' }],
        });

        verifyResources();

        expect(esClientMock.bulk).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when writing/bootstrapping with an existing, compatible index', () => {
    beforeEach(async () => {
      await esClientMock.indices.putIndexTemplate({
        name: TEST_INDEX_NAME,
        _meta: {
          version: 'current_version',
        },
        template: {
          mappings: {
            _meta: {
              version: 'current_version',
            },
            properties: {
              foo: { type: 'keyword', meta: { required: 'true' } },
            },
          },
        },
      });

      await esClientMock.indices.create({
        index: getIndexName(1),
      });

      esClientMock.indices.putIndexTemplate.mockClear();
      esClientMock.indices.create.mockClear();
    });

    it('does not recreate or update index template', async () => {
      await adapter.index({ id: 'doc2', document: { foo: 'bar' } });

      expect(esClientMock.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(esClientMock.indices.create).not.toHaveBeenCalled();

      expect(esClientMock.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'test_index',
          id: 'doc2',
        })
      );
    });
  });

  describe('when writing/bootstrapping with an existing, outdated index', () => {
    beforeEach(async () => {
      await esClientMock.indices.putIndexTemplate({
        name: TEST_INDEX_NAME,
        _meta: {
          version: 'first_version',
        },
        template: {
          mappings: {
            _meta: {
              version: 'first_version',
            },
            properties: {},
          },
        },
      });

      await esClientMock.indices.create({
        index: getIndexName(1),
      });

      esClientMock.indices.putIndexTemplate.mockClear();
      esClientMock.indices.create.mockClear();
      esClientMock.indices.simulateIndexTemplate.mockClear();
    });

    it('updates index mappings on write', async () => {
      await adapter.index({ id: 'docY', document: { foo: 'bar' } });

      expect(esClientMock.indices.putIndexTemplate).toHaveBeenCalled();
      expect(esClientMock.indices.simulateIndexTemplate).toHaveBeenCalled();

      expect(esClientMock.indices.putMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: {
            foo: {
              type: 'keyword',
              meta: {
                multi_value: 'false',
                required: 'true',
              },
            },
          },
        })
      );
    });
  });

  describe('when indexing', () => {
    describe('a new document', () => {
      it('indexes the document via alias with require_alias=true', async () => {
        const res = await adapter.index({ id: 'doc_1', document: { foo: 'bar' } });

        expect(esClientMock.index).toHaveBeenCalledWith(
          expect.objectContaining({
            index: 'test_index',
            require_alias: true,
            id: 'doc_1',
            document: { foo: 'bar' },
          })
        );

        expect(res._index).toBe('test_index-000001');
        expect(res._id).toBe('doc_1');
      });
    });

    describe('an existing document in any non-write index', () => {
      beforeEach(async () => {
        await adapter.index({ id: 'doc_1', document: { foo: 'bar' } });

        await esClientMock.indices.create({
          index: getIndexName(2),
        });
      });

      it('deletes the dangling item from non-write indices', async () => {
        await adapter.index({ id: 'doc_1', document: { foo: 'bar' } });

        expect(esClientMock.delete).toHaveBeenCalledWith(
          expect.objectContaining({
            index: 'test_index-000001',
            id: 'doc_1',
          })
        );

        expect(esClientMock.index).toHaveBeenCalledWith(
          expect.objectContaining({
            index: 'test_index',
            id: 'doc_1',
          })
        );
      });
    });
  });

  describe('when bulk indexing', () => {
    describe('an existing document in any non-write index', () => {
      beforeEach(async () => {
        await adapter.bulk({
          operations: [
            {
              index: {
                _id: 'doc_1',
              },
            },
            {
              foo: 'bar',
            },
          ],
        });

        await esClientMock.indices.create({
          index: getIndexName(2),
        });
      });

      it('deletes the dangling item from non-write indices', async () => {
        await adapter.bulk({
          operations: [
            {
              index: {
                _id: 'doc_1',
              },
            },
            {
              foo: 'bar',
            },
          ],
        });

        expect(esClientMock.bulk).toHaveBeenLastCalledWith(
          expect.objectContaining({
            index: 'test_index',
            operations: [
              {
                index: {
                  _id: 'doc_1',
                },
              },
              {
                foo: 'bar',
              },
              {
                delete: {
                  _index: getIndexName(1),
                  _id: 'doc_1',
                },
              },
            ],
          })
        );
      });
    });
  });

  function mockEmptyState() {
    esClientMock.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [],
    });
    esClientMock.indices.existsIndexTemplate.mockResolvedValue(false);

    esClientMock.indices.simulateIndexTemplate.mockImplementation(async () => {
      throw new errors.ResponseError({ statusCode: 404, warnings: [], meta: {} as any });
    });

    esClientMock.indices.existsAlias.mockResolvedValue(false);
    esClientMock.indices.exists.mockResolvedValue(false);
    esClientMock.indices.getAlias.mockResolvedValue({});

    esClientMock.index.mockImplementation(async () => {
      throw new errors.ResponseError({ statusCode: 404, warnings: [], meta: {} as any });
    });

    esClientMock.bulk.mockImplementation(async () => {
      throw new errors.ResponseError({ statusCode: 404, warnings: [], meta: {} as any });
    });
  }

  function mockCreateAPIs() {
    const indices: Map<
      string,
      Pick<IndicesIndexState, 'aliases' | 'mappings' | 'settings'>
    > = new Map();

    const docs: Array<{ _id: string; _source: Record<string, any>; _index: string }> = [];

    function getCurrentWriteIndex() {
      return Array.from(indices.entries()).find(
        ([indexName, indexState]) => indexState.aliases![TEST_INDEX_NAME].is_write_index
      )?.[0];
    }

    esClientMock.indices.putIndexTemplate.mockImplementation(async (_templateRequest) => {
      const templateRequest = _templateRequest as Required<
        IndicesPutIndexTemplateRequest,
        'template'
      >;

      esClientMock.indices.existsIndexTemplate.mockResolvedValue(true);
      esClientMock.indices.getIndexTemplate.mockResolvedValue({
        index_templates: [
          {
            name: templateRequest.name,
            index_template: {
              _meta: templateRequest._meta,
              template: templateRequest.template,
              index_patterns: `${TEST_INDEX_NAME}*`,
              composed_of: [],
            },
          },
        ],
      });

      esClientMock.indices.simulateIndexTemplate.mockImplementation(
        async (mockSimulateRequest): Promise<IndicesSimulateIndexTemplateResponse> => {
          return {
            template: {
              aliases: templateRequest.template?.aliases ?? {},
              mappings: templateRequest.template?.mappings ?? {},
              settings: templateRequest.template?.settings ?? {},
            },
          };
        }
      );

      esClientMock.indices.create.mockImplementation(async (createIndexRequest) => {
        const indexName = createIndexRequest.index;

        const prevIndices = Array.from(indices.entries());

        prevIndices.forEach(([currentIndexName, indexState]) => {
          indexState.aliases![TEST_INDEX_NAME] = {
            is_write_index: false,
          };
        });

        indices.set(indexName, {
          aliases: merge({}, templateRequest.template.aliases ?? {}, {
            [TEST_INDEX_NAME]: { is_write_index: true },
          }),
          mappings: templateRequest.template.mappings ?? {},
          settings: templateRequest.template.settings ?? {},
        });

        esClientMock.indices.getAlias.mockImplementation(async (aliasRequest) => {
          return Object.fromEntries(
            Array.from(indices.entries()).map(([currentIndexName, indexState]) => {
              return [
                currentIndexName,
                { aliases: indexState.aliases ?? {} } satisfies IndicesGetAliasIndexAliases,
              ];
            })
          );
        });

        esClientMock.indices.get.mockImplementation(async () => {
          return Object.fromEntries(indices.entries());
        });

        esClientMock.index.mockImplementation(async (_indexRequest) => {
          const indexRequest = _indexRequest as IndexRequest;
          const id = indexRequest.id ?? v4();
          const index = getCurrentWriteIndex()!;

          docs.push({
            _id: id,
            _index: index,
            _source: indexRequest.document!,
          });

          return {
            _id: id,
            _index: index,
            _shards: {
              failed: 0,
              successful: 1,
              total: 1,
            },
            _version: 1,
            result: 'created',
          };
        });

        esClientMock.search.mockImplementation(async (_searchRequest) => {
          const searchRequest = _searchRequest as SearchRequest;

          const ids = castArray(searchRequest.query?.bool?.filter ?? [])?.[0]?.terms
            ?._id as string[];

          const excludeIndex = castArray(searchRequest.query?.bool?.must_not)?.[0]?.term
            ?._index as string;

          const matches = docs.filter((doc) => {
            return ids.includes(doc._id) && doc._index !== excludeIndex;
          });

          return {
            took: 0,
            timed_out: false,
            _shards: {
              successful: 1,
              failed: 0,
              total: 1,
            },
            hits: {
              hits: matches,
              total: {
                value: matches.length,
                relation: 'eq',
              },
            },
          };
        });

        esClientMock.bulk.mockImplementation(async (_bulkRequest) => {
          const bulkRequest = _bulkRequest as BulkRequest<Record<string, any>>;

          const items: Array<Partial<Record<'delete' | 'index', BulkResponseItem>>> = [];

          bulkRequest.operations?.forEach((operation, index, operations) => {
            if ('index' in operation) {
              const indexOperation = operation.index as BulkIndexOperation;
              const document = {
                _id: indexOperation._id ?? v4(),
                _index: indexOperation._index ?? getCurrentWriteIndex()!,
                _source: operations[index + 1],
              };
              docs.push(document);

              items.push({ index: { _id: document._id, _index: document._index, status: 200 } });
            } else if ('delete' in operation) {
              const deleteOperation = operation.delete as BulkDeleteOperation;
              remove(docs, (doc) => {
                return doc._id === deleteOperation._id && doc._index === deleteOperation._index;
              });

              items.push({
                delete: {
                  _id: deleteOperation._id!,
                  _index: deleteOperation._index!,
                  status: 200,
                },
              });
            }
          });

          return {
            errors: false,
            took: 0,
            items,
          };
        });

        return { acknowledged: true, index: createIndexRequest.index, shards_acknowledged: true };
      });

      return { acknowledged: true };
    });
  }
});

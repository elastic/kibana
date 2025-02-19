/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkOperationContainer,
  IndexResponse,
  IndicesIndexState,
  IndicesIndexTemplate,
  IndicesPutIndexTemplateIndexTemplateMapping,
  MappingProperty,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { last, mapValues, padStart } from 'lodash';
import { DiagnosticResult, errors } from '@elastic/elasticsearch';
import {
  IndexStorageSettings,
  StorageClientBulkResponse,
  StorageClientDeleteResponse,
  StorageClientBulk,
  StorageClientDelete,
  StorageClientIndex,
  StorageClientIndexResponse,
  StorageClientSearch,
  StorageClientGet,
  StorageClientExistsIndex,
  StorageDocumentOf,
  StorageClientSearchResponse,
  StorageClientClean,
  StorageClientCleanResponse,
  ApplicationDocument,
  InternalIStorageClient,
} from '..';
import { getSchemaVersion } from '../get_schema_version';
import { StorageMappingProperty } from '../types';

function getAliasName(name: string) {
  return name;
}

function getBackingIndexPattern(name: string) {
  return `${name}-*`;
}

function getBackingIndexName(name: string, count: number) {
  const countId = padStart(count.toString(), 6, '0');
  return `${name}-${countId}`;
}

function getIndexTemplateName(name: string) {
  return `${name}`;
}

// TODO: this function is here to strip properties when we add back optional/multi-value
// which should be implemented in pipelines
function toElasticsearchMappingProperty(property: StorageMappingProperty): MappingProperty {
  return property;
}

function catchConflictError(error: Error) {
  if (isResponseError(error) && error.statusCode === 409) {
    return;
  }
  throw error;
}

function isNotFoundError(error: Error): error is errors.ResponseError & { statusCode: 404 } {
  return isResponseError(error) && error.statusCode === 404;
}

/*
 * When calling into Elasticsearch, the stack trace is lost.
 * If we create an error before calling, and append it to
 * any stack of the caught error, we get a more useful stack
 * trace.
 */
function wrapEsCall<T>(p: Promise<T>): Promise<T> {
  const error = new Error();
  return p.catch((caughtError) => {
    caughtError.stack += error.stack;
    throw caughtError;
  });
}

/**
 * Adapter for writing and reading documents to/from Elasticsearch,
 * using plain indices.
 *
 * TODO:
 * - Index Lifecycle Management
 * - Schema upgrades w/ fallbacks
 */
export class StorageIndexAdapter<TStorageSettings extends IndexStorageSettings, TApplicationType> {
  private readonly logger: Logger;
  constructor(
    private readonly esClient: ElasticsearchClient,
    logger: Logger,
    private readonly storage: TStorageSettings
  ) {
    this.logger = logger.get('storage').get(this.storage.name);
  }

  private getSearchIndexPattern(): string {
    return `${getAliasName(this.storage.name)}`;
  }

  private getWriteTarget(): string {
    return getAliasName(this.storage.name);
  }

  private async createOrUpdateIndexTemplate(): Promise<void> {
    const version = getSchemaVersion(this.storage);

    const template: IndicesPutIndexTemplateIndexTemplateMapping = {
      mappings: {
        _meta: {
          version,
        },
        dynamic: 'strict',
        properties: {
          ...mapValues(this.storage.schema.properties, toElasticsearchMappingProperty),
        },
      },
      aliases: {
        [getAliasName(this.storage.name)]: {
          is_write_index: true,
        },
      },
    };

    await wrapEsCall(
      this.esClient.indices.putIndexTemplate({
        name: getIndexTemplateName(this.storage.name),
        create: false,
        allow_auto_create: false,
        index_patterns: getBackingIndexPattern(this.storage.name),
        _meta: {
          version,
        },
        template,
      })
    ).catch(catchConflictError);
  }

  private async getExistingIndexTemplate(): Promise<IndicesIndexTemplate | undefined> {
    return await wrapEsCall(
      this.esClient.indices.getIndexTemplate({
        name: getIndexTemplateName(this.storage.name),
      })
    )
      .then((templates) => templates.index_templates[0]?.index_template)
      .catch((error) => {
        if (isNotFoundError(error)) {
          return undefined;
        }
        throw error;
      });
  }

  private async getCurrentWriteIndex(): Promise<
    { name: string; state: IndicesIndexState } | undefined
  > {
    const [writeIndex, indices] = await Promise.all([
      this.getCurrentWriteIndexName(),
      this.getExistingIndices(),
    ]);

    return writeIndex ? { name: writeIndex, state: indices[writeIndex] } : undefined;
  }

  private async getExistingIndices() {
    return wrapEsCall(
      this.esClient.indices.get({
        index: getBackingIndexPattern(this.storage.name),
        allow_no_indices: true,
      })
    );
  }

  private async getCurrentWriteIndexName(): Promise<string | undefined> {
    const aliasName = getAliasName(this.storage.name);

    const aliases = await wrapEsCall(
      this.esClient.indices.getAlias({
        name: getAliasName(this.storage.name),
      })
    ).catch((error) => {
      if (isResponseError(error) && error.statusCode === 404) {
        return {};
      }
      throw error;
    });

    const writeIndex = Object.entries(aliases)
      .map(([name, alias]) => {
        return {
          name,
          isWriteIndex: alias.aliases[aliasName]?.is_write_index === true,
        };
      })
      .find(({ isWriteIndex }) => {
        return isWriteIndex;
      });

    return writeIndex?.name;
  }

  private async createNextBackingIndex(): Promise<void> {
    const writeIndex = await this.getCurrentWriteIndexName();

    const nextIndexName = getBackingIndexName(
      this.storage.name,
      writeIndex ? parseInt(last(writeIndex.split('-'))!, 10) : 1
    );

    await wrapEsCall(
      this.esClient.indices.create({
        index: nextIndexName,
      })
    ).catch(catchConflictError);
  }

  private async updateMappingsOfExistingIndex({ name }: { name: string }) {
    const simulateIndexTemplateResponse = await this.esClient.indices.simulateIndexTemplate({
      name: getBackingIndexName(this.storage.name, 999999),
    });

    if (simulateIndexTemplateResponse.template.settings) {
      await this.esClient.indices.putSettings({
        index: name,
        settings: simulateIndexTemplateResponse.template.settings,
      });
    }

    if (simulateIndexTemplateResponse.template.mappings) {
      await this.esClient.indices.putMapping({
        index: name,
        ...simulateIndexTemplateResponse.template.mappings,
      });
    }
  }

  /**
   * Validates whether:
   * - an index template exists
   * - the index template has the right version (if not, update it)
   * - a write index exists (if it doesn't, create it)
   * - the write index has the right version (if not, update it)
   */
  private async validateComponentsBeforeWriting<T>(cb: () => Promise<T>): Promise<T> {
    const [writeIndex, existingIndexTemplate] = await Promise.all([
      this.getCurrentWriteIndex(),
      this.getExistingIndexTemplate(),
    ]);

    const expectedSchemaVersion = getSchemaVersion(this.storage);

    if (!existingIndexTemplate) {
      this.logger.info(`Creating index template as it does not exist`);
      await this.createOrUpdateIndexTemplate();
    } else if (existingIndexTemplate._meta?.version !== expectedSchemaVersion) {
      this.logger.info(`Updating existing index template`);
      await this.createOrUpdateIndexTemplate();
    }

    if (!writeIndex) {
      this.logger.info(`Creating first backing index`);
      await this.createNextBackingIndex();
    } else if (writeIndex?.state.mappings?._meta?.version !== expectedSchemaVersion) {
      this.logger.info(`Updating mappings of existing write index due to schema version mismatch`);
      await this.updateMappingsOfExistingIndex({
        name: writeIndex.name,
      });
    }

    return await cb();
  }

  /**
   * Get items from all non-write indices for the specified ids.
   */
  private async getDanglingItems({ ids }: { ids: string[] }) {
    if (!ids.length) {
      return [];
    }

    const writeIndex = await this.getCurrentWriteIndexName();

    if (writeIndex) {
      const danglingItemsResponse = await this.search({
        track_total_hits: false,
        query: {
          bool: {
            filter: [{ terms: { _id: ids } }],
            must_not: [
              {
                term: {
                  _index: writeIndex,
                },
              },
            ],
          },
        },
        size: 10_000,
      });

      return danglingItemsResponse.hits.hits.map((hit) => ({
        id: hit._id!,
        index: hit._index,
      }));
    }
    return [];
  }

  private search: StorageClientSearch<ApplicationDocument<TApplicationType>> = async (request) => {
    return (await wrapEsCall(
      this.esClient
        .search({
          ...request,
          index: this.getSearchIndexPattern(),
          allow_no_indices: true,
        })
        .catch((error): StorageClientSearchResponse<StorageDocumentOf<TStorageSettings>, any> => {
          if (isNotFoundError(error)) {
            return {
              _shards: {
                failed: 0,
                successful: 0,
                total: 0,
              },
              hits: {
                hits: [],
                total: {
                  relation: 'eq',
                  value: 0,
                },
              },
              timed_out: false,
              took: 0,
            };
          }
          throw error;
        })
    )) as unknown as ReturnType<StorageClientSearch<ApplicationDocument<TApplicationType>>>;
  };

  private index: StorageClientIndex<ApplicationDocument<TApplicationType>> = async ({
    id,
    refresh = 'wait_for',
    ...request
  }): Promise<StorageClientIndexResponse> => {
    const attemptIndex = async (): Promise<IndexResponse> => {
      const [danglingItem] = id ? await this.getDanglingItems({ ids: [id] }) : [undefined];

      const [indexResponse] = await Promise.all([
        wrapEsCall(
          this.esClient.index({
            ...request,
            id,
            refresh,
            index: this.getWriteTarget(),
            require_alias: true,
          })
        ),
        danglingItem
          ? wrapEsCall(
              this.esClient.delete({
                id: danglingItem.id,
                index: danglingItem.index,
                refresh,
              })
            )
          : Promise.resolve(),
      ]);

      return indexResponse;
    };

    return this.validateComponentsBeforeWriting(attemptIndex).then(async (response) => {
      this.logger.debug(() => `Indexed document ${id} into ${response._index}`);

      return response;
    });
  };

  private bulk: StorageClientBulk<ApplicationDocument<TApplicationType>> = ({
    operations,
    refresh = 'wait_for',
    ...request
  }): Promise<StorageClientBulkResponse> => {
    this.logger.debug(`Processing ${operations.length} bulk operations`);

    const bulkOperations = operations.flatMap((operation): BulkOperationContainer[] => {
      if ('index' in operation) {
        return [
          {
            index: {
              _id: operation.index._id,
            },
          },
          operation.index.document as {},
        ];
      }

      return [operation];
    });

    const attemptBulk = async () => {
      const indexedIds =
        bulkOperations.flatMap((operation) => {
          if (
            'index' in operation &&
            operation.index &&
            typeof operation.index === 'object' &&
            '_id' in operation.index &&
            typeof operation.index._id === 'string'
          ) {
            return operation.index._id ?? [];
          }
          return [];
        }) ?? [];

      const danglingItems = await this.getDanglingItems({ ids: indexedIds });

      if (danglingItems.length) {
        this.logger.debug(`Deleting ${danglingItems.length} dangling items`);
      }

      return wrapEsCall(
        this.esClient.bulk({
          ...request,
          refresh,
          operations: bulkOperations.concat(
            danglingItems.map((item) => ({ delete: { _index: item.index, _id: item.id } }))
          ),
          index: this.getWriteTarget(),
          require_alias: true,
        })
      );
    };

    return this.validateComponentsBeforeWriting(attemptBulk).then(async (response) => {
      return response;
    });
  };

  private clean: StorageClientClean = async (): Promise<StorageClientCleanResponse> => {
    const allIndices = await this.getExistingIndices();
    const hasIndices = Object.keys(allIndices).length > 0;
    // Delete all indices
    await Promise.all(
      Object.keys(allIndices).map((index) =>
        wrapEsCall(
          this.esClient.indices.delete({
            index,
          })
        )
      )
    );
    // Delete the index template
    const template = await this.getExistingIndexTemplate();
    const hasTemplate = !!template;
    if (template) {
      await wrapEsCall(
        this.esClient.indices.deleteIndexTemplate({
          name: getIndexTemplateName(this.storage.name),
        })
      );
    }

    return {
      acknowledged: true,
      result: hasIndices || hasTemplate ? 'deleted' : 'noop',
    };
  };

  private delete: StorageClientDelete = async ({
    id,
    refresh = 'wait_for',
    ...request
  }): Promise<StorageClientDeleteResponse> => {
    this.logger.debug(`Deleting document with id ${id}`);
    const searchResponse = await this.search({
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: [
            {
              term: {
                _id: id,
              },
            },
          ],
        },
      },
    });

    const document = searchResponse.hits.hits[0];

    if (document) {
      await wrapEsCall(
        this.esClient.delete({
          ...request,
          refresh,
          id,
          index: document._index,
        })
      );

      return { acknowledged: true, result: 'deleted' };
    }

    return { acknowledged: true, result: 'not_found' };
  };

  private get: StorageClientGet<ApplicationDocument<TApplicationType>> = async ({
    id,
    ...request
  }) => {
    const response = await this.search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [
            {
              term: {
                _id: id,
              },
            },
          ],
        },
      },
      ...request,
    });

    const hit: SearchHit = response.hits.hits[0];

    if (!hit) {
      throw new errors.ResponseError({
        meta: {
          aborted: false,
          attempts: 1,
          connection: null,
          context: null,
          name: 'resource_not_found_exception',
          request: {} as unknown as DiagnosticResult['meta']['request'],
        },
        warnings: [],
        body: 'resource_not_found_exception',
        statusCode: 404,
      });
    }

    return {
      _id: hit._id!,
      _index: hit._index,
      found: true,
      _source: hit._source as ApplicationDocument<TApplicationType>,
      _ignored: hit._ignored,
      _primary_term: hit._primary_term,
      _routing: hit._routing,
      _seq_no: hit._seq_no,
      _version: hit._version,
      fields: hit.fields,
    };
  };

  private existsIndex: StorageClientExistsIndex = () => {
    return this.esClient.indices.exists({
      index: this.getSearchIndexPattern(),
    });
  };

  getClient(): InternalIStorageClient<ApplicationDocument<TApplicationType>> {
    return {
      bulk: this.bulk,
      delete: this.delete,
      clean: this.clean,
      index: this.index,
      search: this.search,
      get: this.get,
      existsIndex: this.existsIndex,
    };
  }
}

export type SimpleStorageIndexAdapter<TStorageSettings extends IndexStorageSettings> =
  StorageIndexAdapter<TStorageSettings, Omit<StorageDocumentOf<TStorageSettings>, '_id'>>;

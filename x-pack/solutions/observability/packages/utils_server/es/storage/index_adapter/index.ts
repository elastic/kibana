/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndexResponse,
  IndicesIndexState,
  IndicesIndexTemplate,
  IndicesPutIndexTemplateIndexTemplateMapping,
  MappingProperty,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { InferSearchResponseOf } from '@kbn/es-types';
import { last, mapValues, padStart } from 'lodash';
import {
  IStorageAdapter,
  IndexStorageSettings,
  StorageAdapterBulkRequest,
  StorageAdapterBulkResponse,
  StorageAdapterDeleteRequest,
  StorageAdapterDeleteResponse,
  StorageAdapterIndexRequest,
  StorageAdapterIndexResponse,
  StorageAdapterSearchRequest,
  StorageAdapterSearchResponse,
} from '..';
import { getSchemaVersion } from '../get_schema_version';
import { StorageClient } from '../storage_client';
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

function toElasticsearchMappingProperty(property: StorageMappingProperty): MappingProperty {
  const { required, multi_value: multiValue, enum: enums, ...rest } = property;

  return {
    ...rest,
    meta: {
      ...property.meta,
      required: JSON.stringify(required ?? false),
      multi_value: JSON.stringify(multiValue ?? false),
      ...(enums ? { enum: JSON.stringify(enums) } : {}),
    },
  };
}

function catchConflictError(error: Error) {
  if (isResponseError(error) && error.statusCode === 409) {
    return;
  }
  throw error;
}

/**
 * Adapter for writing and reading documents to/from Elasticsearch,
 * using plain indices.
 *
 * TODO:
 * - Index Lifecycle Management
 * - Schema upgrades w/ fallbacks
 */
export class StorageIndexAdapter<TStorageSettings extends IndexStorageSettings>
  implements IStorageAdapter<TStorageSettings>
{
  private readonly logger: Logger;
  constructor(
    private readonly esClient: ElasticsearchClient,
    logger: Logger,
    private readonly storage: TStorageSettings
  ) {
    this.logger = logger.get('storage').get(this.storage.name);
  }

  private getSearchIndexPattern(): string {
    return `${getAliasName(this.storage.name)}*`;
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
        properties: mapValues(this.storage.schema.properties, toElasticsearchMappingProperty),
      },
      aliases: {
        [getAliasName(this.storage.name)]: {
          is_write_index: true,
        },
      },
    };

    await this.esClient.indices
      .putIndexTemplate({
        name: getIndexTemplateName(this.storage.name),
        create: false,
        allow_auto_create: false,
        index_patterns: getBackingIndexPattern(this.storage.name),
        _meta: {
          version,
        },
        template,
      })
      .catch(catchConflictError);
  }

  private async getExistingIndexTemplate(): Promise<IndicesIndexTemplate | undefined> {
    return await this.esClient.indices
      .getIndexTemplate({
        name: getIndexTemplateName(this.storage.name),
      })
      .then((templates) => templates.index_templates[0]?.index_template)
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
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
    return this.esClient.indices.get({
      index: getBackingIndexPattern(this.storage.name),
      allow_no_indices: true,
    });
  }

  private async getCurrentWriteIndexName(): Promise<string | undefined> {
    const aliasName = getAliasName(this.storage.name);

    const aliases = await this.esClient.indices
      .getAlias({
        name: getAliasName(this.storage.name),
      })
      .catch((error) => {
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

    await this.esClient.indices
      .create({
        index: nextIndexName,
      })
      .catch(catchConflictError);
  }

  private async updateMappingsOfExistingIndex({ name }: { name: string }) {
    const simulateIndexTemplateResponse = await this.esClient.indices.simulateIndexTemplate({
      name: getIndexTemplateName(this.storage.name),
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

  async search<TDocument, TSearchRequest extends Omit<SearchRequest, 'index'>>(
    request: StorageAdapterSearchRequest
  ): Promise<StorageAdapterSearchResponse<TDocument, TSearchRequest>> {
    return this.esClient.search({
      ...request,
      index: this.getSearchIndexPattern(),
      allow_no_indices: true,
    }) as unknown as Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  }

  /**
   * Get items from all non-write indices for the specified ids.
   */
  private async getDanglingItems({ ids }: { ids: string[] }) {
    const writeIndex = await this.getCurrentWriteIndexName();

    if (writeIndex && ids.length) {
      const danglingItemsResponse = await this.search({
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

  async index(request: StorageAdapterIndexRequest): Promise<StorageAdapterIndexResponse> {
    const attemptIndex = async (): Promise<IndexResponse> => {
      const [danglingItem] = request.id
        ? await this.getDanglingItems({ ids: [request.id] })
        : [undefined];

      if (danglingItem) {
        await this.esClient.delete({
          id: danglingItem.id,
          index: danglingItem.index,
          refresh: false,
        });
      }

      return this.esClient.index({
        ...request,
        refresh: request.refresh,
        index: this.getWriteTarget(),
        require_alias: true,
      });
    };

    return this.validateComponentsBeforeWriting(attemptIndex).then(async (response) => {
      this.logger.debug(() => `Indexed document ${request.id} into ${response._index}`);

      return response;
    });
  }

  async bulk<TDocument extends Record<string, any>>(
    request: StorageAdapterBulkRequest<TDocument>
  ): Promise<StorageAdapterBulkResponse> {
    const attemptBulk = async () => {
      const indexedIds =
        request.operations?.flatMap((operation) => {
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

      return this.esClient.bulk({
        ...request,
        operations: (request.operations || []).concat(
          danglingItems.map((item) => ({ delete: { _index: item.index, _id: item.id } }))
        ),
        index: this.getWriteTarget(),
        require_alias: true,
      });
    };

    return this.validateComponentsBeforeWriting(attemptBulk).then(async (response) => {
      return response;
    });
  }

  async delete({
    id,
    index,
    refresh,
  }: StorageAdapterDeleteRequest): Promise<StorageAdapterDeleteResponse> {
    return await this.esClient.delete({
      index,
      id,
      refresh,
    });
  }

  getClient(): StorageClient<TStorageSettings> {
    return new StorageClient<TStorageSettings>(this, this.logger);
  }
}

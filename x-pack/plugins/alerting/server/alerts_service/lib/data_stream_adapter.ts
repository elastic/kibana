/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import {
  CreateConcreteWriteIndexOpts,
  ConcreteIndexInfo,
  updateIndexMappings,
  setConcreteWriteIndex,
} from './create_concrete_write_index';
import { retryTransientEsErrors } from './retry_transient_es_errors';

export interface DataStreamAdapter {
  isUsingDataStreams(): boolean;
  getIndexTemplateFields(alias: string, pattern: string): IndexTemplateFields;
  createStream(opts: CreateConcreteWriteIndexOpts): Promise<void>;
}

export interface BulkOpProperties {
  require_alias: boolean;
}

export interface IndexTemplateFields {
  data_stream?: { hidden: true };
  index_patterns: string[];
  rollover_alias?: string;
}

export interface GetDataStreamAdapterOpts {
  useDataStreamForAlerts: boolean;
}

export function getDataStreamAdapter(opts: GetDataStreamAdapterOpts): DataStreamAdapter {
  if (opts.useDataStreamForAlerts) {
    return new DataStreamImplementation();
  } else {
    return new AliasImplementation();
  }
}

// implementation using data streams
class DataStreamImplementation implements DataStreamAdapter {
  isUsingDataStreams(): boolean {
    return true;
  }

  getIndexTemplateFields(alias: string, pattern: string): IndexTemplateFields {
    return {
      data_stream: { hidden: true },
      index_patterns: [alias],
    };
  }

  async createStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
    return createDataStream(opts);
  }
}

// implementation using aliases and backing indices
class AliasImplementation implements DataStreamAdapter {
  isUsingDataStreams(): boolean {
    return false;
  }

  getIndexTemplateFields(alias: string, pattern: string): IndexTemplateFields {
    return {
      index_patterns: [pattern],
      rollover_alias: alias,
    };
  }

  async createStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
    return createAliasStream(opts);
  }
}

async function createDataStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
  const { logger, esClient, indexPatterns, totalFieldsLimit } = opts;
  logger.debug(`Creating data stream - ${indexPatterns.alias}`);

  // check if data stream exists
  let dataStreamExists = false;
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name: indexPatterns.alias, expand_wildcards: 'all' }),
      { logger }
    );
    dataStreamExists = response.data_streams.length > 0;
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching data stream for ${indexPatterns.alias} - ${error.message}`);
      throw error;
    }
  }

  // if a data stream exists, update the underlying mapping
  if (dataStreamExists) {
    await updateIndexMappings({
      logger,
      esClient,
      totalFieldsLimit,
      concreteIndices: [
        { alias: indexPatterns.alias, index: indexPatterns.alias, isWriteIndex: true },
      ],
    });
  } else {
    try {
      await retryTransientEsErrors(
        () =>
          esClient.indices.createDataStream({
            name: indexPatterns.alias,
          }),
        { logger }
      );
    } catch (error) {
      if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        logger.error(`Error creating data stream ${indexPatterns.alias} - ${error.message}`);
        throw error;
      }
    }
  }
}

async function createAliasStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
  const { logger, esClient, indexPatterns, totalFieldsLimit } = opts;
  logger.debug(`Creating concrete write index - ${indexPatterns.name}`);

  // check if a concrete write index already exists
  let concreteIndices: ConcreteIndexInfo[] = [];
  try {
    // Specify both the index pattern for the backing indices and their aliases
    // The alias prevents the request from finding other namespaces that could match the -* pattern
    const response = await retryTransientEsErrors(
      () =>
        esClient.indices.getAlias({
          index: indexPatterns.pattern,
          name: indexPatterns.basePattern,
        }),
      { logger }
    );

    concreteIndices = Object.entries(response).flatMap(([index, { aliases }]) =>
      Object.entries(aliases).map(([aliasName, aliasProperties]) => ({
        index,
        alias: aliasName,
        isWriteIndex: aliasProperties.is_write_index ?? false,
      }))
    );

    logger.debug(
      () =>
        `Found ${concreteIndices.length} concrete indices for ${
          indexPatterns.name
        } - ${JSON.stringify(concreteIndices)}`
    );
  } catch (error) {
    // 404 is expected if no concrete write indices have been created
    if (error.statusCode !== 404) {
      logger.error(
        `Error fetching concrete indices for ${indexPatterns.pattern} pattern - ${error.message}`
      );
      throw error;
    }
  }

  let concreteWriteIndicesExist = false;
  // if a concrete write index already exists, update the underlying mapping
  if (concreteIndices.length > 0) {
    await updateIndexMappings({
      logger,
      esClient,
      totalFieldsLimit,
      concreteIndices,
      validIndexPrefixes: indexPatterns.validPrefixes,
    });

    const concreteIndicesExist = concreteIndices.some(
      (index) => index.alias === indexPatterns.alias
    );
    concreteWriteIndicesExist = concreteIndices.some(
      (index) => index.alias === indexPatterns.alias && index.isWriteIndex
    );

    // If there are some concrete indices but none of them are the write index, we'll throw an error
    // because one of the existing indices should have been the write target.
    if (concreteIndicesExist && !concreteWriteIndicesExist) {
      logger.debug(
        `Indices matching pattern ${indexPatterns.pattern} exist but none are set as the write index for alias ${indexPatterns.alias}`
      );
      await setConcreteWriteIndex({ logger, esClient, concreteIndices });
      concreteWriteIndicesExist = true;
    }
  }

  // check if a concrete write index already exists
  if (!concreteWriteIndicesExist) {
    try {
      await retryTransientEsErrors(
        () =>
          esClient.indices.create({
            index: indexPatterns.name,
            body: {
              aliases: {
                [indexPatterns.alias]: {
                  is_write_index: true,
                },
              },
            },
          }),
        { logger }
      );
    } catch (error) {
      logger.error(`Error creating concrete write index - ${error.message}`);
      // If the index already exists and it's the write index for the alias,
      // something else created it so suppress the error. If it's not the write
      // index, that's bad, throw an error.
      if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        const existingIndices = await retryTransientEsErrors(
          () => esClient.indices.get({ index: indexPatterns.name }),
          { logger }
        );
        if (!existingIndices[indexPatterns.name]?.aliases?.[indexPatterns.alias]?.is_write_index) {
          throw Error(
            `Attempted to create index: ${indexPatterns.name} as the write index for alias: ${indexPatterns.alias}, but the index already exists and is not the write index for the alias`
          );
        }
      } else {
        throw error;
      }
    }
  }
}

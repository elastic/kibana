/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateConcreteWriteIndexOpts, updateIndexMappings } from './create_concrete_write_index';
import { retryTransientEsErrors } from './retry_transient_es_errors';

export interface DataStreamAdapter {
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

export function getDataStreamAdapter(): DataStreamAdapter {
  return new DataStreamImplementation();
}

// implementation using data streams
class DataStreamImplementation implements DataStreamAdapter {
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

async function createDataStream(opts: CreateConcreteWriteIndexOpts): Promise<void> {
  const { logger, esClient, indexPatterns, totalFieldsLimit } = opts;
  logger.info(`Creating data stream - ${indexPatterns.alias}`);

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

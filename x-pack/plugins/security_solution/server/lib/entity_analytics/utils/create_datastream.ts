/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This file is a copy of x-pack/plugins/alerting/server/alerts_service/lib/create_concrete_write_index.ts
// original function create index instead of datastream, and their have plan to use datastream in the future
// so we probably should remove this file and use the original when datastream will be supported

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { retryTransientEsErrors } from './retry_transient_es_errors';
import { updateIndexMappings } from './update_mappings';

export interface IIndexPatternString {
  template: string;
  alias: string;
}

interface CreateConcreteWriteIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  indexPatterns: IIndexPatternString;
}
/**
 * Create a data stream
 */
export const createDataStream = async ({
  logger,
  esClient,
  indexPatterns,
  totalFieldsLimit,
}: CreateConcreteWriteIndexOpts) => {
  logger.info(`Creating data stream - ${indexPatterns.alias}`);

  // check if a datastream already exists
  let dataStreams: string[] = [];
  try {
    // Specify both the index pattern for the backing indices and their aliases
    // The alias prevents the request from finding other namespaces that could match the -* pattern
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name: indexPatterns.alias, expand_wildcards: 'all' }),
      { logger }
    );

    dataStreams = response.data_streams.map((dataStream) => dataStream.name);

    logger.debug(
      `Found ${dataStreams.length} concrete indices for ${indexPatterns.alias} - ${JSON.stringify(
        dataStreams
      )}`
    );
  } catch (error) {
    // 404 is expected if no datastream have been created
    if (error.statusCode !== 404) {
      logger.error(
        `Error fetching concrete indices for ${indexPatterns.alias} pattern - ${error.message}`
      );
      throw error;
    }
  }

  const dataStreamsExist = dataStreams.length > 0;

  // if a concrete write datastream already exists, update the underlying mapping
  if (dataStreams.length > 0) {
    await updateIndexMappings({ logger, esClient, totalFieldsLimit, indices: dataStreams });
  }

  // check if a concrete write datastream already exists
  if (!dataStreamsExist) {
    try {
      await retryTransientEsErrors(
        () =>
          esClient.indices.createDataStream({
            name: indexPatterns.alias,
          }),
        { logger }
      );
    } catch (error) {
      logger.error(`Error creating datastream - ${error.message}`);
      throw error;
    }
  }
};

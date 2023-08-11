/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This file is a copy of x-pack/plugins/alerting/server/alerts_service/lib/create_concrete_write_index.ts
// original function create index instead of datastream, and their have plan to use datastream in the future
// so we probably should remove this file and use the original when datastream will be supported

import type { IndicesSimulateIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { retryTransientEsErrors } from './retry_transient_es_errors';

export interface IIndexPatternString {
  template: string;
  alias: string;
}

interface ConcreteIndexInfo {
  index: string;
  alias: string;
  isWriteIndex: boolean;
}

interface UpdateIndexMappingsOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  concreteIndices: ConcreteIndexInfo[];
}

interface UpdateIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  concreteIndexInfo: ConcreteIndexInfo;
}

const updateTotalFieldLimitSetting = async ({
  logger,
  esClient,
  totalFieldsLimit,
  concreteIndexInfo,
}: UpdateIndexOpts) => {
  const { index, alias } = concreteIndexInfo;
  try {
    await retryTransientEsErrors(
      () =>
        esClient.indices.putSettings({
          index,
          body: { 'index.mapping.total_fields.limit': totalFieldsLimit },
        }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Failed to PUT index.mapping.total_fields.limit settings for alias ${alias}: ${err.message}`
    );
    throw err;
  }
};

// This will update the mappings of backing indices but *not* the settings. This
// is due to the fact settings can be classed as dynamic and static, and static
// updates will fail on an index that isn't closed. New settings *will* be applied as part
// of the ILM policy rollovers. More info: https://github.com/elastic/kibana/pull/113389#issuecomment-940152654
const updateUnderlyingMapping = async ({
  logger,
  esClient,
  concreteIndexInfo,
}: UpdateIndexOpts) => {
  const { index, alias } = concreteIndexInfo;
  let simulatedIndexMapping: IndicesSimulateIndexTemplateResponse;
  try {
    simulatedIndexMapping = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: index }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Ignored PUT mappings for alias ${alias}; error generating simulated mappings: ${err.message}`
    );
    return;
  }

  const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

  if (simulatedMapping == null) {
    logger.error(`Ignored PUT mappings for alias ${alias}; simulated mappings were empty`);
    return;
  }

  try {
    await retryTransientEsErrors(
      () => esClient.indices.putMapping({ index, body: simulatedMapping }),
      { logger }
    );
  } catch (err) {
    logger.error(`Failed to PUT mapping for alias ${alias}: ${err.message}`);
    throw err;
  }
};
/**
 * Updates the underlying mapping for any existing concrete indices
 */
const updateIndexMappings = async ({
  logger,
  esClient,
  totalFieldsLimit,
  concreteIndices,
}: UpdateIndexMappingsOpts) => {
  logger.debug(`Updating underlying mappings for ${concreteIndices.length} indices.`);

  // Update total field limit setting of found indices
  // Other index setting changes are not updated at this time
  await Promise.all(
    concreteIndices.map((index) =>
      updateTotalFieldLimitSetting({ logger, esClient, totalFieldsLimit, concreteIndexInfo: index })
    )
  );

  // Update mappings of the found indices.
  await Promise.all(
    concreteIndices.map((index) =>
      updateUnderlyingMapping({ logger, esClient, totalFieldsLimit, concreteIndexInfo: index })
    )
  );
};

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
  let dataStreams: ConcreteIndexInfo[] = [];
  try {
    // Specify both the index pattern for the backing indices and their aliases
    // The alias prevents the request from finding other namespaces that could match the -* pattern
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name: indexPatterns.alias, expand_wildcards: 'all' }),
      { logger }
    );

    dataStreams = response.data_streams.map((dataStream) => ({
      index: dataStream.name,
      alias: dataStream.name,
      isWriteIndex: true,
    }));

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
    await updateIndexMappings({ logger, esClient, totalFieldsLimit, concreteIndices: dataStreams });
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

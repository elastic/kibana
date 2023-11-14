/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { IndicesSimulateIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { retryTransientEsErrors } from './retry_transient_es_errors';

interface UpdateIndexMappingsOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit?: number;
  indices: string[];
}

interface UpdateIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit?: number;
  index: string;
}

const updateTotalFieldLimitSetting = async ({
  logger,
  esClient,
  totalFieldsLimit,
  index,
}: UpdateIndexOpts) => {
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
      `Failed to PUT index.mapping.total_fields.limit settings for index ${index}: ${err.message}`
    );
    throw err;
  }
};

// This will update the mappings of  indices but *not* the settings. This
// is due to the fact settings can be classed as dynamic and static, and static
// updates will fail on an index that isn't closed. New settings *will* be applied as part
// of the ILM policy rollovers. More info: https://github.com/elastic/kibana/pull/113389#issuecomment-940152654
const updateUnderlyingMapping = async ({ logger, esClient, index }: UpdateIndexOpts) => {
  let simulatedIndexMapping: IndicesSimulateIndexTemplateResponse;
  try {
    simulatedIndexMapping = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: index }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Ignored PUT mappings for index ${index}; error generating simulated mappings: ${err.message}`
    );
    return;
  }

  const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

  if (simulatedMapping == null) {
    logger.error(`Ignored PUT mappings for index ${index}; simulated mappings were empty`);
    return;
  }

  try {
    await retryTransientEsErrors(
      () => esClient.indices.putMapping({ index, body: simulatedMapping }),
      { logger }
    );
  } catch (err) {
    logger.error(`Failed to PUT mapping for index ${index}: ${err.message}`);
    throw err;
  }
};
/**
 * Updates the underlying mapping for any existing concrete indices
 */
export const updateIndexMappings = async ({
  logger,
  esClient,
  totalFieldsLimit,
  indices,
}: UpdateIndexMappingsOpts) => {
  logger.debug(`Updating underlying mappings for ${indices.length} indices.`);

  if (totalFieldsLimit) {
    // Update total field limit setting of found indices
    // Other index setting changes are not updated at this time
    await Promise.all(
      indices.map((index) =>
        updateTotalFieldLimitSetting({ logger, esClient, totalFieldsLimit, index })
      )
    );
  }

  // Update mappings of the found indices.
  await Promise.all(indices.map((index) => updateUnderlyingMapping({ logger, esClient, index })));
};

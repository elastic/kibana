/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesSimulateIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { get, sortBy } from 'lodash';
import { IIndexPatternString } from '../resource_installer_utils';
import { retryTransientEsErrors } from './retry_transient_es_errors';
import { DataStreamAdapter } from './data_stream_adapter';

export interface ConcreteIndexInfo {
  index: string;
  alias: string;
  isWriteIndex: boolean;
}

interface UpdateIndexMappingsOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  validIndexPrefixes?: string[];
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
    return;
  } catch (err) {
    logger.error(
      `Failed to PUT index.mapping.total_fields.limit settings for ${alias}: ${err.message}`
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
      `Ignored PUT mappings for ${alias}; error generating simulated mappings: ${err.message}`
    );
    return;
  }

  const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

  if (simulatedMapping == null) {
    logger.error(`Ignored PUT mappings for ${alias}; simulated mappings were empty`);
    return;
  }

  try {
    await retryTransientEsErrors(
      () => esClient.indices.putMapping({ index, body: simulatedMapping }),
      { logger }
    );

    return;
  } catch (err) {
    logger.error(`Failed to PUT mapping for ${alias}: ${err.message}`);
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
  concreteIndices,
  validIndexPrefixes,
}: UpdateIndexMappingsOpts) => {
  let validConcreteIndices = [];
  if (validIndexPrefixes) {
    for (const cIdx of concreteIndices) {
      if (!validIndexPrefixes?.some((prefix: string) => cIdx.index.startsWith(prefix))) {
        logger.warn(
          `Found unexpected concrete index name "${
            cIdx.index
          }" while expecting index with one of the following prefixes: [${validIndexPrefixes.join(
            ','
          )}] Not updating mappings or settings for this index.`
        );
      } else {
        validConcreteIndices.push(cIdx);
      }
    }
  } else {
    validConcreteIndices = concreteIndices;
  }

  logger.debug(
    `Updating underlying mappings for ${validConcreteIndices.length} indices / data streams.`
  );

  // Update total field limit setting of found indices
  // Other index setting changes are not updated at this time
  await Promise.all(
    validConcreteIndices.map((index) =>
      updateTotalFieldLimitSetting({ logger, esClient, totalFieldsLimit, concreteIndexInfo: index })
    )
  );

  // Update mappings of the found indices.
  await Promise.all(
    validConcreteIndices.map((index) =>
      updateUnderlyingMapping({ logger, esClient, totalFieldsLimit, concreteIndexInfo: index })
    )
  );
};

export interface CreateConcreteWriteIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  indexPatterns: IIndexPatternString;
  dataStreamAdapter: DataStreamAdapter;
}
/**
 * Installs index template that uses installed component template
 * Prior to installation, simulates the installation to check for possible
 * conflicts. Simulate should return an empty mapping if a template
 * conflicts with an already installed template.
 */
export const createConcreteWriteIndex = async (opts: CreateConcreteWriteIndexOpts) => {
  await opts.dataStreamAdapter.createStream(opts);
};

interface SetConcreteWriteIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  concreteIndices: ConcreteIndexInfo[];
}

export async function setConcreteWriteIndex(opts: SetConcreteWriteIndexOpts) {
  const { logger, esClient, concreteIndices } = opts;
  const lastIndex = concreteIndices.length - 1;
  const concreteIndex = sortBy(concreteIndices, ['index'])[lastIndex];
  logger.debug(
    `Attempting to set index: ${concreteIndex.index} as the write index for alias: ${concreteIndex.alias}.`
  );
  try {
    await retryTransientEsErrors(
      () =>
        esClient.indices.updateAliases({
          body: {
            actions: [
              { remove: { index: concreteIndex.index, alias: concreteIndex.alias } },
              {
                add: {
                  index: concreteIndex.index,
                  alias: concreteIndex.alias,
                  is_write_index: true,
                },
              },
            ],
          },
        }),
      { logger }
    );
    logger.info(
      `Successfully set index: ${concreteIndex.index} as the write index for alias: ${concreteIndex.alias}.`
    );
  } catch (error) {
    throw new Error(
      `Failed to set index: ${concreteIndex.index} as the write index for alias: ${concreteIndex.alias}.`
    );
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesSimulateIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { IIndexPatternString } from '../resource_installer_utils';
import { retryTransientEsErrors } from './retry_transient_es_errors';

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
    return;
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
    simulatedIndexMapping = await esClient.indices.simulateIndexTemplate({
      name: index,
    });
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

    return;
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
 * Installs index template that uses installed component template
 * Prior to installation, simulates the installation to check for possible
 * conflicts. Simulate should return an empty mapping if a template
 * conflicts with an already installed template.
 */
export const createConcreteWriteIndex = async ({
  logger,
  esClient,
  indexPatterns,
  totalFieldsLimit,
}: CreateConcreteWriteIndexOpts) => {
  logger.info(`Creating concrete write index - ${indexPatterns.name}`);

  // check if a concrete write index already exists
  let concreteIndices: ConcreteIndexInfo[] = [];
  try {
    // Specify both the index pattern for the backing indices and their aliases
    // The alias prevents the request from finding other namespaces that could match the -* pattern
    const response = await esClient.indices.getAlias({
      index: indexPatterns.pattern,
      name: indexPatterns.basePattern,
    });

    concreteIndices = Object.entries(response).flatMap(([index, { aliases }]) =>
      Object.entries(aliases).map(([aliasName, aliasProperties]) => ({
        index,
        alias: aliasName,
        isWriteIndex: aliasProperties.is_write_index ?? false,
      }))
    );

    logger.debug(
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
    await updateIndexMappings({ logger, esClient, totalFieldsLimit, concreteIndices });

    const concreteIndicesExist = concreteIndices.some(
      (index) => index.alias === indexPatterns.alias
    );
    concreteWriteIndicesExist = concreteIndices.some(
      (index) => index.alias === indexPatterns.alias && index.isWriteIndex
    );

    // If there are some concrete indices but none of them are the write index, we'll throw an error
    // because one of the existing indices should have been the write target.
    if (concreteIndicesExist && !concreteWriteIndicesExist) {
      throw new Error(
        `Indices matching pattern ${indexPatterns.pattern} exist but none are set as the write index for alias ${indexPatterns.alias}`
      );
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
        {
          logger,
        }
      );
    } catch (error) {
      logger.error(`Error creating concrete write index - ${error.message}`);
      // If the index already exists and it's the write index for the alias,
      // something else created it so suppress the error. If it's not the write
      // index, that's bad, throw an error.
      if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        const existingIndices = await esClient.indices.get({
          index: indexPatterns.name,
        });
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
};

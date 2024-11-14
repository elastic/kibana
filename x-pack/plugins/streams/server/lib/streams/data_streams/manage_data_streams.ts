/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { retryTransientEsErrors } from '../helpers/retry';

interface DataStreamManagementOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

interface DeleteDataStreamOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

interface RolloverDataStreamOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

export async function upsertDataStream({ esClient, name, logger }: DataStreamManagementOptions) {
  const dataStreamExists = await esClient.indices.exists({ index: name });
  if (dataStreamExists) {
    return;
  }
  try {
    await retryTransientEsErrors(() => esClient.indices.createDataStream({ name }), { logger });
    logger.debug(() => `Installed data stream: ${name}`);
  } catch (error: any) {
    logger.error(`Error creating data stream: ${error.message}`);
    throw error;
  }
}

export async function deleteDataStream({ esClient, name, logger }: DeleteDataStreamOptions) {
  try {
    await retryTransientEsErrors(
      () => esClient.indices.deleteDataStream({ name }, { ignore: [404] }),
      { logger }
    );
  } catch (error: any) {
    logger.error(`Error deleting data stream: ${error.message}`);
    throw error;
  }
}

export async function rolloverDataStreamIfNecessary({
  esClient,
  name,
  logger,
}: RolloverDataStreamOptions) {
  const dataStreams = await esClient.indices.getDataStream({ name: `${name},${name}.*` });
  for (const dataStream of dataStreams.data_streams) {
    const currentMappings =
      Object.values(
        await esClient.indices.getMapping({
          index: dataStream.indices.at(-1)?.index_name,
        })
      )[0].mappings.properties || {};
    const simulatedIndex = await esClient.indices.simulateIndexTemplate({ name: dataStream.name });
    const simulatedMappings = simulatedIndex.template.mappings.properties || {};

    // check whether the same fields and same types are listed (don't check for other mapping attributes)
    const isDifferent =
      Object.values(simulatedMappings).length !== Object.values(currentMappings).length ||
      Object.entries(simulatedMappings || {}).some(([fieldName, { type }]) => {
        const currentType = currentMappings[fieldName]?.type;
        return currentType !== type;
      });

    if (!isDifferent) {
      continue;
    }

    try {
      await retryTransientEsErrors(() => esClient.indices.rollover({ alias: dataStream.name }), {
        logger,
      });
      logger.debug(() => `Rolled over data stream: ${dataStream.name}`);
    } catch (error: any) {
      logger.error(`Error rolling over data stream: ${error.message}`);
      throw error;
    }
  }
}

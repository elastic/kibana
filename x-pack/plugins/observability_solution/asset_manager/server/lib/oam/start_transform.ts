/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { OAMDefinition } from '@kbn/oam-schema';
import { retryTransientEsErrors } from './helpers/retry';
import { generateTransformId } from './transform/generate_transform_id';

export async function startTransform(
  esClient: ElasticsearchClient,
  definition: OAMDefinition,
  logger: Logger
) {
  const transformId = generateTransformId(definition);
  try {
    await retryTransientEsErrors(
      () => esClient.transform.startTransform({ transform_id: transformId }, { ignore: [409] }),
      { logger }
    );
  } catch (err) {
    logger.error(`Cannot start SLO transform [${transformId}]`);
    throw err;
  }
}

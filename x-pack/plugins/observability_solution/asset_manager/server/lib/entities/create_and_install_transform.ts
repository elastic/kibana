/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/oam-schema';
import { generateTransform } from './transform/generate_transform';
import { retryTransientEsErrors } from './helpers/retry';
import { EntitySecurityException } from './errors/entity_security_exception';

export async function createAndInstallTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  const transform = generateTransform(definition);
  try {
    await retryTransientEsErrors(() => esClient.transform.putTransform(transform), { logger });
  } catch (e) {
    logger.error(`Cannot create entity transform for [${definition.id}] entity definition`);
    if (e.meta?.body?.error?.type === 'security_exception') {
      throw new EntitySecurityException(e.meta.body.error.reason, definition);
    }
    throw e;
  }
  return transform.transform_id;
}

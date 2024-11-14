/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { installBuiltInEntityDefinitions } from './install_entity_definition';
import { startTransforms } from './start_transforms';
import { EntityManagerServerSetup } from '../../types';
import { checkIfEntityDiscoveryAPIKeyIsValid, readEntityDiscoveryAPIKey } from '../auth';
import { getClientsFromAPIKey } from '../utils';
import { ERROR_API_KEY_NOT_FOUND } from '../../../common/errors';

export async function upgradeBuiltInEntityDefinitions({
  definitions,
  server,
}: {
  definitions: EntityDefinition[];
  server: EntityManagerServerSetup;
}): Promise<
  { success: true; definitions: EntityDefinition[] } | { success: false; reason: string }
> {
  const { logger } = server;
  const apiKey = await readEntityDiscoveryAPIKey(server);
  if (!apiKey) {
    return { success: false, reason: ERROR_API_KEY_NOT_FOUND };
  }

  const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, apiKey);
  if (!isValid) {
    throw new Error(
      'Stored API key is not valid, skipping built-in definition upgrade. You can re-enable Entity Discovery to update the key.'
    );
  }

  const { esClient, soClient } = getClientsFromAPIKey({ apiKey, server });

  logger.debug(`Starting built-in definitions upgrade`);
  const upgradedDefinitions = await installBuiltInEntityDefinitions({
    esClient,
    soClient,
    definitions,
    logger,
  });

  await Promise.all(
    upgradedDefinitions.map((definition) => startTransforms(esClient, definition, logger))
  );

  return { success: true, definitions: upgradedDefinitions };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import { EntityDefinition } from '@kbn/entities-schema';
import { findEntityDefinitions } from './find_entity_definition';
import { uninstallEntityDefinition } from './uninstall_entity_definition';
import { installEntityDefinition } from './install_entity_definition';
import { EntityManagerServerSetup } from '../../types';
import { checkIfEntityDiscoveryAPIKeyIsValid, readEntityDiscoveryAPIKey } from '../auth';
import { getClientsFromAPIKey } from '../utils';

export async function updateBuiltInEntityDefinitions({
  definitions,
  server,
}: {
  definitions: EntityDefinition[];
  server: EntityManagerServerSetup;
}) {
  const { logger } = server;
  const apiKey = await readEntityDiscoveryAPIKey(server);
  if (!apiKey) {
    logger.debug('No API key found, skipping built-in definition upgrade');
    return;
  }

  const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, apiKey);
  if (!isValid) {
    logger.debug(`Stored API key is not valid, skipping built-in definition upgrade`);
    return;
  }

  logger.debug(`Starting built-in definitions upgrade`);
  const { esClient, soClient } = getClientsFromAPIKey({ apiKey, server });

  const updatePromises = definitions.map(async (latestDefinition) => {
    const [installedDefinition] = await findEntityDefinitions({
      id: latestDefinition.id,
      soClient,
      esClient,
    });
    if (!installedDefinition) {
      logger.info(
        `Installing built-in entity definition [${latestDefinition.id}] version ${latestDefinition.version}`
      );
      return installEntityDefinition({ esClient, soClient, logger, definition: latestDefinition });
    }

    if (semver.eq(latestDefinition.version, installedDefinition.version)) {
      logger.debug(
        `Built-in entity definition [${latestDefinition.version}] latest version ${latestDefinition.version} already installed`
      );
      return latestDefinition;
    }

    logger.info(
      `Updating built-in entity definition [${latestDefinition.id}] from version ${installedDefinition.version} to ${latestDefinition.version}`
    );
    await uninstallEntityDefinition({
      esClient,
      soClient,
      logger,
      definition: installedDefinition,
    });
    return installEntityDefinition({ esClient, soClient, logger, definition: latestDefinition });
  });

  return Promise.all(updatePromises);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/logging';
import { EntityDefinition } from '@kbn/entities-schema';
import { findEntityDefinitions } from './find_entity_definition';
import { installAndStartDefinition, _installEntityDefinition } from './install_entity_definition';
import { EntityManagerServerSetup } from '../../types';
import { checkIfEntityDiscoveryAPIKeyIsValid, readEntityDiscoveryAPIKey } from '../auth';
import { getClientsFromAPIKey } from '../utils';
import {
  stopAndDeleteHistoryBackfillTransform,
  stopAndDeleteHistoryTransform,
  stopAndDeleteLatestTransform,
} from './stop_and_delete_transform';
import { isBackfillEnabled } from './helpers/is_backfill_enabled';
import { updateEntityDefinition } from './save_entity_definition';
import { startTransform } from './start_transform';
import { ERROR_API_KEY_NOT_FOUND, ERROR_API_KEY_NOT_VALID } from '../../../common/errors';

export interface UpgradeDefinitionParams {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  prevDefinition: EntityDefinition;
  nextDefinition: EntityDefinition;
  logger: Logger;
}

export async function upgradeEntityDefinition({
  esClient,
  soClient,
  prevDefinition,
  nextDefinition,
  logger,
}: UpgradeDefinitionParams): Promise<EntityDefinition> {
  logger.debug(
    `Upgrading definition ${prevDefinition.id} from v${prevDefinition.version} to v${nextDefinition.version}`
  );

  try {
    await updateEntityDefinition(soClient, prevDefinition.id, {
      ...nextDefinition,
      installStatus: 'installing',
      installStartedAt: new Date().toISOString(),
    });

    logger.debug(
      `Stopping transforms for definition ${nextDefinition.id} v${prevDefinition.version}`
    );
    await Promise.allSettled([
      stopAndDeleteHistoryTransform(esClient, prevDefinition, logger),
      isBackfillEnabled(prevDefinition)
        ? stopAndDeleteHistoryBackfillTransform(esClient, prevDefinition, logger)
        : Promise.resolve(),
      stopAndDeleteLatestTransform(esClient, prevDefinition, logger),
    ]);

    await _installEntityDefinition({
      esClient,
      soClient,
      logger,
      definition: nextDefinition,
    });

    await startTransform(esClient, nextDefinition, logger);

    return nextDefinition;
  } catch (err) {
    await updateEntityDefinition(soClient, prevDefinition.id, {
      installStatus: 'failed',
    });

    throw err;
  }
}

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
    return { success: false, reason: ERROR_API_KEY_NOT_VALID };
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
        `Installing built-in entity definition [${latestDefinition.id}] v${latestDefinition.version}`
      );
      return installAndStartDefinition({
        esClient,
        soClient,
        logger,
        definition: latestDefinition,
      });
    }

    // equality check to account for rollbacks
    if (
      semver.eq(latestDefinition.version, installedDefinition.version) &&
      installedDefinition.installStatus === 'installed'
    ) {
      logger.debug(
        `Built-in entity definition [${latestDefinition.version}] latest version v${latestDefinition.version} already installed`
      );
      return latestDefinition;
    }

    logger.info(
      `Updating built-in entity definition [${latestDefinition.id}] from v${installedDefinition.version} to v${latestDefinition.version}`
    );
    return upgradeEntityDefinition({
      esClient,
      soClient,
      logger,
      prevDefinition: installedDefinition,
      nextDefinition: latestDefinition,
    });
  });

  const updatedDefinitions = await Promise.all(updatePromises);
  return { success: true, definitions: updatedDefinitions };
}

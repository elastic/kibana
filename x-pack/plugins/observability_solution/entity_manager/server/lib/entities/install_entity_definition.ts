/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { EntityDefinition } from '@kbn/entities-schema';
import { Logger } from '@kbn/logging';
import {
  getEntityHistoryIndexTemplateV1,
  getEntityLatestIndexTemplateV1,
} from '../../../common/helpers';
import {
  createAndInstallHistoryIngestPipeline,
  createAndInstallLatestIngestPipeline,
} from './create_and_install_ingest_pipeline';
import {
  createAndInstallHistoryBackfillTransform,
  createAndInstallHistoryTransform,
  createAndInstallLatestTransform,
} from './create_and_install_transform';
import { validateDefinitionCanCreateValidTransformIds } from './transform/validate_transform_ids';
import { deleteEntityDefinition } from './delete_entity_definition';
import { deleteHistoryIngestPipeline, deleteLatestIngestPipeline } from './delete_ingest_pipeline';
import { findEntityDefinitions } from './find_entity_definition';
import {
  entityDefinitionExists,
  saveEntityDefinition,
  updateEntityDefinition,
} from './save_entity_definition';
import { startTransform } from './start_transform';
import {
  stopAndDeleteHistoryBackfillTransform,
  stopAndDeleteHistoryTransform,
  stopAndDeleteLatestTransform,
} from './stop_and_delete_transform';
import { uninstallEntityDefinition } from './uninstall_entity_definition';
import { isBackfillEnabled } from './helpers/is_backfill_enabled';
import { deleteTemplate, upsertTemplate } from '../manage_index_templates';
import { getEntitiesLatestIndexTemplateConfig } from './templates/entities_latest_template';
import { getEntitiesHistoryIndexTemplateConfig } from './templates/entities_history_template';
import { EntityIdConflict } from './errors/entity_id_conflict_error';

export interface InstallDefinitionParams {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  definition: EntityDefinition;
  logger: Logger;
}

/**
 * install an entity definition and all its required components after
 * validating that the definition id is valid and available.
 * attempt to remove all installed components if the installation fails.
 */
export async function installEntityDefinition({
  esClient,
  soClient,
  definition,
  logger,
}: InstallDefinitionParams): Promise<EntityDefinition> {
  try {
    validateDefinitionCanCreateValidTransformIds(definition);

    if (await entityDefinitionExists(soClient, definition.id)) {
      throw new EntityIdConflict(
        `Entity definition with [${definition.id}] already exists.`,
        definition
      );
    }

    return _installEntityDefinition({ esClient, soClient, definition, logger });
  } catch (e) {
    logger.error(`Failed to install entity definition ${definition.id}: ${e}`);

    await Promise.allSettled([
      stopAndDeleteHistoryTransform(esClient, definition, logger),
      stopAndDeleteHistoryBackfillTransform(esClient, definition, logger),
      stopAndDeleteLatestTransform(esClient, definition, logger),
    ]);

    await Promise.allSettled([
      deleteHistoryIngestPipeline(esClient, definition, logger),
      deleteLatestIngestPipeline(esClient, definition, logger),
    ]);

    await Promise.allSettled([
      deleteTemplate({
        esClient,
        logger,
        name: getEntityHistoryIndexTemplateV1(definition.id),
      }),
      deleteTemplate({
        esClient,
        logger,
        name: getEntityLatestIndexTemplateV1(definition.id),
      }),
    ]);

    await deleteEntityDefinition(soClient, definition, logger);

    throw e;
  }
}

export async function _installEntityDefinition({
  esClient,
  soClient,
  definition,
  logger,
}: InstallDefinitionParams): Promise<EntityDefinition> {
  logger.debug(
    () =>
      `Installing definition ${definition.id} v${definition.version}\n${JSON.stringify(
        definition,
        null,
        2
      )}`
  );

  const entityDefinition = await saveEntityDefinition(soClient, {
    ...definition,
    installStatus: 'installing',
    installStartedAt: new Date().toISOString(),
  });

  logger.debug(`Installing index templates for definition ${definition.id}`);
  await Promise.allSettled([
    upsertTemplate({
      esClient,
      logger,
      template: getEntitiesHistoryIndexTemplateConfig(definition.id),
    }),
    upsertTemplate({
      esClient,
      logger,
      template: getEntitiesLatestIndexTemplateConfig(definition.id),
    }),
  ]);

  logger.debug(`Installing ingest pipelines for definition ${definition.id}`);
  await Promise.allSettled([
    createAndInstallHistoryIngestPipeline(esClient, definition, logger),
    createAndInstallLatestIngestPipeline(esClient, definition, logger),
  ]);

  logger.debug(`Installing transforms for definition ${definition.id}`);
  await Promise.allSettled([
    createAndInstallHistoryTransform(esClient, definition, logger),
    isBackfillEnabled(definition)
      ? createAndInstallHistoryBackfillTransform(esClient, definition, logger)
      : Promise.resolve(),
    createAndInstallLatestTransform(esClient, definition, logger),
  ]);

  await updateEntityDefinition(soClient, definition.id, { installStatus: 'installed' });

  return entityDefinition;
}

export async function installBuiltInEntityDefinitions({
  esClient,
  soClient,
  logger,
  definitions,
}: Omit<InstallDefinitionParams, 'definition'> & {
  definitions: EntityDefinition[];
}): Promise<EntityDefinition[]> {
  if (definitions.length === 0) return [];

  logger.debug(`Starting installation of ${definitions.length} built-in definitions`);
  const installPromises = definitions.map(async (builtInDefinition) => {
    const installedDefinitions = await findEntityDefinitions({
      esClient,
      soClient,
      id: builtInDefinition.id,
    });

    if (installedDefinitions.length === 0) {
      return await installAndStartDefinition({
        definition: builtInDefinition,
        esClient,
        soClient,
        logger,
      });
    }

    const definition = installedDefinitions[0];
    // verify current installation
    if (!definition.state.installed || semver.neq(definition.version, builtInDefinition.version)) {
      logger.debug(
        `Detected partial or outdated installation of definition [${definition.id}] v${definition.version}, reinstalling v${builtInDefinition.version}`
      );
      await uninstallEntityDefinition({ esClient, soClient, logger, definition });
      return await installAndStartDefinition({
        definition: builtInDefinition,
        esClient,
        soClient,
        logger,
      });
    }

    if (!definition.state.running) {
      logger.debug(`Starting transforms for definition [${definition.id}]`);
      await startTransform(esClient, definition, logger);
    }
    return definition;
  });

  return await Promise.all(installPromises);
}

export async function installAndStartDefinition(params: InstallDefinitionParams) {
  const definition = await installEntityDefinition(params);
  await startTransform(params.esClient, definition, params.logger);
  return definition;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { saveEntityDefinition } from './save_entity_definition';
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

export interface InstallDefinitionParams {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  definition: EntityDefinition;
  logger: Logger;
}

export async function installEntityDefinition({
  esClient,
  soClient,
  definition,
  logger,
}: InstallDefinitionParams): Promise<EntityDefinition> {
  const installState = {
    ingestPipelines: {
      history: false,
      latest: false,
    },
    transforms: {
      history: false,
      backfill: false,
      latest: false,
    },
    definition: false,
    indexTemplates: {
      history: false,
      latest: false,
    },
  };

  try {
    logger.debug(() => `Installing definition ${JSON.stringify(definition)}`);

    validateDefinitionCanCreateValidTransformIds(definition);

    const entityDefinition = await saveEntityDefinition(soClient, definition);
    installState.definition = true;

    // install scoped index template
    await upsertTemplate({
      esClient,
      logger,
      template: getEntitiesHistoryIndexTemplateConfig(definition.id),
    });
    installState.indexTemplates.history = true;
    await upsertTemplate({
      esClient,
      logger,
      template: getEntitiesLatestIndexTemplateConfig(definition.id),
    });
    installState.indexTemplates.latest = true;

    // install ingest pipelines
    logger.debug(`Installing ingest pipelines for definition ${definition.id}`);
    await createAndInstallHistoryIngestPipeline(esClient, entityDefinition, logger);
    installState.ingestPipelines.history = true;
    await createAndInstallLatestIngestPipeline(esClient, entityDefinition, logger);
    installState.ingestPipelines.latest = true;

    // install transforms
    logger.debug(`Installing transforms for definition ${definition.id}`);
    await createAndInstallHistoryTransform(esClient, entityDefinition, logger);
    installState.transforms.history = true;
    if (isBackfillEnabled(entityDefinition)) {
      await createAndInstallHistoryBackfillTransform(esClient, entityDefinition, logger);
      installState.transforms.backfill = true;
    }
    await createAndInstallLatestTransform(esClient, entityDefinition, logger);
    installState.transforms.latest = true;

    return entityDefinition;
  } catch (e) {
    logger.error(`Failed to install entity definition ${definition.id}: ${e}`);
    // Clean up anything that was successful.
    if (installState.definition) {
      await deleteEntityDefinition(soClient, definition, logger);
    }

    if (installState.ingestPipelines.history) {
      await deleteHistoryIngestPipeline(esClient, definition, logger);
    }
    if (installState.ingestPipelines.latest) {
      await deleteLatestIngestPipeline(esClient, definition, logger);
    }

    if (installState.transforms.history) {
      await stopAndDeleteHistoryTransform(esClient, definition, logger);
    }

    if (installState.transforms.backfill) {
      await stopAndDeleteHistoryBackfillTransform(esClient, definition, logger);
    }

    if (installState.transforms.latest) {
      await stopAndDeleteLatestTransform(esClient, definition, logger);
    }

    if (installState.indexTemplates.history) {
      await deleteTemplate({
        esClient,
        logger,
        name: getEntityHistoryIndexTemplateV1(definition.id),
      });
    }
    if (installState.indexTemplates.latest) {
      await deleteTemplate({
        esClient,
        logger,
        name: getEntityLatestIndexTemplateV1(definition.id),
      });
    }

    throw e;
  }
}

export async function installBuiltInEntityDefinitions({
  esClient,
  soClient,
  logger,
  builtInDefinitions,
}: Omit<InstallDefinitionParams, 'definition'> & {
  builtInDefinitions: EntityDefinition[];
}): Promise<EntityDefinition[]> {
  if (builtInDefinitions.length === 0) return [];

  logger.debug(`Starting installation of ${builtInDefinitions.length} built-in definitions`);
  const installPromises = builtInDefinitions.map(async (builtInDefinition) => {
    const definitions = await findEntityDefinitions({
      esClient,
      soClient,
      id: builtInDefinition.id,
    });

    if (definitions.length === 0) {
      return await installAndStartDefinition({
        definition: builtInDefinition,
        esClient,
        soClient,
        logger,
      });
    }

    const definition = definitions[0];
    // verify current installation
    if (!definition.state.installed) {
      logger.debug(`Detected partial installation of definition [${definition.id}], reinstalling`);
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

async function installAndStartDefinition(params: InstallDefinitionParams) {
  const definition = await installEntityDefinition(params);
  await startTransform(params.esClient, definition, params.logger);
  return definition;
}

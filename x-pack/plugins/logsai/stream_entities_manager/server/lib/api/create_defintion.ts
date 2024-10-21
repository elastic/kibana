/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/logging';
import { ApiScraperDefinition } from '../../../common/types';
import { saveDefinition } from './save_definition';
import { upsertTemplate } from '../../templates/manage_index_templates';
import { generateInstanceIndexTemplateConfig } from './templates/stream_entities_manager_instance';

interface CreateDefinitionParams {
  logger: Logger;
  soClient: SavedObjectsClientContract;
  scopedClusterClient: IScopedClusterClient;
  rawDefinition: ApiScraperDefinition;
}
export async function createDefintion({
  soClient,
  scopedClusterClient,
  rawDefinition,
  logger,
}: CreateDefinitionParams) {
  const definition = await saveDefinition(soClient, rawDefinition);

  await upsertTemplate({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    logger,
    template: generateInstanceIndexTemplateConfig(definition),
  });

  return definition;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';
import { EntityDefinitionNotFound } from './errors/entity_not_found';

export async function deleteEntityDefinition(
  soClient: SavedObjectsClientContract,
  definition: EntityDefinition,
  logger: Logger
) {
  const response = await soClient.find<EntityDefinition>({
    type: SO_ENTITY_DEFINITION_TYPE,
    page: 1,
    perPage: 1,
    filter: `${SO_ENTITY_DEFINITION_TYPE}.attributes.id:(${definition.id})`,
  });

  if (response.total === 0) {
    logger.error(`Unable to delete entity definition [${definition.id}] because it doesn't exist.`);
    throw new EntityDefinitionNotFound(`Entity definition with [${definition.id}] not found.`);
  }

  await soClient.delete(SO_ENTITY_DEFINITION_TYPE, response.saved_objects[0].id);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';
import { EntityDefinitionNotFound } from './errors/entity_not_found';

export async function readEntityDefinition(
  soClient: SavedObjectsClientContract,
  id: string,
  logger: Logger
) {
  const response = await soClient.find<EntityDefinition>({
    type: SO_ENTITY_DEFINITION_TYPE,
    page: 1,
    perPage: 1,
    filter: `${SO_ENTITY_DEFINITION_TYPE}.attributes.id:(${id})`,
  });
  if (response.total === 0) {
    const message = `Unable to find entity definition with [${id}]`;
    logger.error(message);
    throw new EntityDefinitionNotFound(message);
  }

  try {
    return entityDefinitionSchema.parse(response.saved_objects[0].attributes);
  } catch (e) {
    logger.error(`Unable to parse entity definition with [${id}]`);
    throw e;
  }
}

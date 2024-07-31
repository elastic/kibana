/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';
import { EntityIdConflict } from './errors/entity_id_conflict_error';

export async function saveEntityDefinition(
  soClient: SavedObjectsClientContract,
  definition: EntityDefinition
): Promise<EntityDefinition> {
  const response = await soClient.find<EntityDefinition>({
    type: SO_ENTITY_DEFINITION_TYPE,
    page: 1,
    perPage: 1,
    filter: `${SO_ENTITY_DEFINITION_TYPE}.attributes.id:(${definition.id})`,
  });

  if (response.total === 1) {
    throw new EntityIdConflict(
      `Entity definition with [${definition.id}] already exists.`,
      definition
    );
  }

  await soClient.create<EntityDefinition>(SO_ENTITY_DEFINITION_TYPE, definition, {
    id: definition.id,
    managed: definition.managed,
    overwrite: true,
  });

  return definition;
}

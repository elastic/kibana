/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';

export async function findEntityDefinitions({
  soClient,
  managed,
  page = 1,
  perPage = 10,
}: {
  soClient: SavedObjectsClientContract;
  page?: number;
  perPage?: number;
  managed?: boolean;
}): Promise<EntityDefinition[]> {
  const response = await soClient.find<EntityDefinition>({
    type: SO_ENTITY_DEFINITION_TYPE,
    filter:
      typeof managed === 'boolean'
        ? `${SO_ENTITY_DEFINITION_TYPE}.attributes.managed:(${managed})`
        : undefined,
    page,
    perPage,
  });

  return response.saved_objects.map(({ attributes }) => attributes);
}

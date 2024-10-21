/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { SO_SEM_DEFINITION_TYPE } from '../../saved_objects';
import { ApiScraperDefinition } from '../../../common/types';

export async function saveDefinition(
  soClient: SavedObjectsClientContract,
  definition: ApiScraperDefinition
): Promise<ApiScraperDefinition> {
  await soClient.create<ApiScraperDefinition>(SO_SEM_DEFINITION_TYPE, definition, {
    id: definition.id,
    managed: definition.managed,
    overwrite: true,
  });

  return definition;
}

export async function apiDefinitionExists(
  soClient: SavedObjectsClientContract,
  id: string
): Promise<boolean> {
  const response = await soClient.find<ApiScraperDefinition>({
    type: SO_SEM_DEFINITION_TYPE,
    page: 1,
    perPage: 1,
    filter: `${SO_SEM_DEFINITION_TYPE}.attributes.id:(${id})`,
  });

  return response.total === 1;
}

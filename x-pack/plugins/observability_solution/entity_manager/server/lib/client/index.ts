/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { findEntityDefinitions } from '../entities/find_entity_definition';
import type { EntityDefinitionWithState } from '../entities/types';

export class EntityManagerClient {
  constructor(
    private readonly esClient: IScopedClusterClient,
    private readonly soClient: SavedObjectsClientContract
  ) {}

  findEntityDefinitions({ page, perPage }: { page?: number; perPage?: number } = {}): Promise<
    EntityDefinition[] | EntityDefinitionWithState[]
  > {
    return findEntityDefinitions({
      esClient: this.esClient.asCurrentUser,
      soClient: this.soClient,
      page,
      perPage,
    });
  }
}

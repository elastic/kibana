/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import type { EntityDefinition } from '@kbn/entities-schema';
import type {
  EngineDescriptor,
  EngineStatus,
  EntityType,
} from '../../../../../common/api/entity_analytics/entity_store/generated/common.gen';

import { entityEngineDescriptorTypeName } from './engine_descriptor_type';
import { getByEntityTypeQuery } from '../utils/utils';

export class EngineDescriptorClient {
  constructor(private readonly soClient: SavedObjectsClientContract) {}

  async init(entityType: EntityType, definition: EntityDefinition) {
    const engineDescriptor = await this.get(entityType);

    if (engineDescriptor.total > 0)
      throw new Error(`Entity engine for ${entityType} already exists`);

    return this.soClient.create<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      {
        status: 'installing',
        type: entityType,
        indexPattern: definition.indexPatterns.join(','),
        filter: '', // TODO: pipe in the filter from the request params
      },
      { id: definition.id }
    );
  }

  async update(id: string, status: EngineStatus) {
    return this.soClient.update<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      id,
      { status },
      { refresh: 'wait_for' }
    );
  }

  async get(entityType: EntityType): Promise<SavedObjectsFindResponse<EngineDescriptor>> {
    return this.soClient.find<EngineDescriptor>({
      type: entityEngineDescriptorTypeName,
      filter: getByEntityTypeQuery(entityType),
    });
  }
}

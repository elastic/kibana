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
} from '../../../../../common/api/entity_analytics/entity_store/common.gen';

import { entityEngineDescriptorTypeName } from './engine_descriptor_type';
import { getByEntityTypeQuery, getEntityDefinition } from '../utils/utils';
import { ENGINE_STATUS } from '../constants';

export class EngineDescriptorClient {
  constructor(private readonly soClient: SavedObjectsClientContract) {}

  async init(entityType: EntityType, definition: EntityDefinition, filter: string) {
    const engineDescriptor = await this.find(entityType);

    if (engineDescriptor.total > 0)
      throw new Error(`Entity engine for ${entityType} already exists`);

    const { attributes } = await this.soClient.create<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      {
        status: ENGINE_STATUS.INSTALLING,
        type: entityType,
        indexPattern: definition.indexPatterns.join(','),
        filter,
      },
      { id: definition.id }
    );
    return attributes;
  }

  async update(id: string, status: EngineStatus) {
    const { attributes } = await this.soClient.update<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      id,
      { status },
      { refresh: 'wait_for' }
    );
    return attributes;
  }

  async find(entityType: EntityType): Promise<SavedObjectsFindResponse<EngineDescriptor>> {
    return this.soClient.find<EngineDescriptor>({
      type: entityEngineDescriptorTypeName,
      filter: getByEntityTypeQuery(entityType),
    });
  }

  async get(entityType: EntityType): Promise<EngineDescriptor> {
    const { id } = getEntityDefinition(entityType);

    const { attributes } = await this.soClient.get<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      id
    );

    return attributes;
  }

  async delete(id: string) {
    return this.soClient.delete(entityEngineDescriptorTypeName, id);
  }
}

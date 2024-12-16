/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryEntity } from '../../../common/entities';
import { getIdentityFieldsPerEntityType } from './get_identity_fields_per_entity_type';

const commonEntityFields: Partial<InventoryEntity> = {
  entityLastSeenTimestamp: '2023-10-09T00:00:00Z',
  entityId: '1',
  entityDisplayName: 'entity_name',
  entityDefinitionId: 'entity_definition_id',
  alertsCount: 3,
};

describe('getIdentityFields', () => {
  it('should return an empty Map when no entities are provided', () => {
    const result = getIdentityFieldsPerEntityType([]);
    expect(result.size).toBe(0);
  });
  it('should return a Map with unique entity types and their respective identity fields', () => {
    const serviceEntity: InventoryEntity = {
      ...(commonEntityFields as InventoryEntity),
      entityIdentityFields: ['service.name', 'service.environment'],
      entityType: 'service',
      agent: {
        name: 'node',
      },
      service: {
        name: 'my-service',
      },
    };

    const hostEntity: InventoryEntity = {
      ...(commonEntityFields as InventoryEntity),
      entityIdentityFields: ['host.name'],
      entityType: 'host',
      cloud: {
        provider: null,
      },
      host: {
        name: 'my-host',
      },
    };

    const containerEntity: InventoryEntity = {
      ...(commonEntityFields as InventoryEntity),
      entityIdentityFields: ['container.id'],
      entityType: 'container',
      host: {
        name: 'my-host',
      },
      cloud: {
        provider: null,
      },
      container: {
        id: '123',
      },
    };

    const mockEntities = [serviceEntity, hostEntity, containerEntity];
    const result = getIdentityFieldsPerEntityType(mockEntities);

    expect(result.size).toBe(3);

    expect(result.get('service')).toEqual(['service.name', 'service.environment']);
    expect(result.get('host')).toEqual(['host.name']);
    expect(result.get('container')).toEqual(['container.id']);
  });
});

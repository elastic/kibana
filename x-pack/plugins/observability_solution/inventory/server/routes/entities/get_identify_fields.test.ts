/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryEntityLatest } from '../../../common/entities';
import { getIdentityFieldsPerEntityType } from './get_identity_fields_per_entity_type';

const commonEntityFields: InventoryEntityLatest = {
  entity: {
    last_seen_timestamp: '2023-10-09T00:00:00Z',
    id: '1',
    display_name: 'entity_name',
    definition_id: 'entity_definition_id',
  } as InventoryEntityLatest['entity'],
  alertCount: 3,
};
describe('getIdentityFields', () => {
  it('should return an empty Map when no entities are provided', () => {
    const result = getIdentityFieldsPerEntityType([]);
    expect(result.size).toBe(0);
  });
  it('should return a Map with unique entity types and their respective identity fields', () => {
    const serviceEntity: InventoryEntityLatest = {
      ...commonEntityFields,
      agent: {
        name: 'node',
      },
      entity: {
        ...commonEntityFields.entity,
        identity_fields: ['service.name', 'service.environment'],
        type: 'service',
      },
      service: {
        name: 'my-service',
      },
    };

    const hostEntity: InventoryEntityLatest = {
      ...commonEntityFields,
      entity: {
        ...commonEntityFields.entity,
        identity_fields: ['host.name'],
        type: 'host',
      },
      host: {
        name: 'my-host',
      },
      cloud: {
        provider: null,
      },
    };

    const containerEntity: InventoryEntityLatest = {
      ...commonEntityFields,
      entity: {
        ...commonEntityFields.entity,
        identity_fields: ['container.id'],
        type: 'container',
      },
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

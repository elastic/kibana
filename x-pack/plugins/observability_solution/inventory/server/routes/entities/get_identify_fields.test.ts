/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../common/entities';
import {
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_ID,
  ENTITY_IDENTITY_FIELDS,
  ENTITY_LAST_SEEN,
} from '@kbn/observability-shared-plugin/common';
import { getIdentityFieldsPerEntityType } from './get_identity_fields_per_entity_type';

const commonEntityFields = {
  [ENTITY_LAST_SEEN]: '2023-10-09T00:00:00Z',
  [ENTITY_ID]: '1',
  [ENTITY_DISPLAY_NAME]: 'entity_name',
  [ENTITY_DEFINITION_ID]: 'entity_definition_id',
  alertCount: 3,
};
describe('getIdentityFields', () => {
  it('should return an empty Map when no entities are provided', () => {
    const result = getIdentityFieldsPerEntityType([]);
    expect(result.size).toBe(0);
  });
  it('should return a Map with unique entity types and their respective identity fields', () => {
    const serviceEntity: Entity = {
      'agent.name': 'node',
      'entity.identity_fields': ['service.name', 'service.environment'],
      'service.name': 'my-service',
      'entity.type': 'service',
      ...commonEntityFields,
    };

    const hostEntity: Entity = {
      [ENTITY_IDENTITY_FIELDS]: ['host.name'],
      'host.name': 'my-host',
      'entity.type': 'host',
      'cloud.provider': null,
      ...commonEntityFields,
    };

    const containerEntity: Entity = {
      [ENTITY_IDENTITY_FIELDS]: 'container.id',
      'host.name': 'my-host',
      'entity.type': 'container',
      'cloud.provider': null,
      'container.id': '123',
      ...commonEntityFields,
    };

    const mockEntities = [serviceEntity, hostEntity, containerEntity];
    const result = getIdentityFieldsPerEntityType(mockEntities);

    expect(result.size).toBe(3);

    expect(result.get('service')).toEqual(['service.name', 'service.environment']);
    expect(result.get('host')).toEqual(['host.name']);
    expect(result.get('container')).toEqual(['container.id']);
  });
});

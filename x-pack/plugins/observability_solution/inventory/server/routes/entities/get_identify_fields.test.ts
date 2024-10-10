/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../common/entities'; // Adjust the import path accordingly
import { ENTITY_IDENTITY_FIELDS, ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { getIdentityFieldsPerEntityType } from './get_identity_fields_per_entity_type';

describe('getIdentityFields', () => {
  it('should return an empty Map when no entities are provided', () => {
    const result = getIdentityFieldsPerEntityType([]);
    expect(result.size).toBe(0);
  });
  it('should return a Map with unique entity types and their respective identity fields', () => {
    const mockEntities = [
      {
        [ENTITY_TYPE]: 'service' as EntityType,
        [ENTITY_IDENTITY_FIELDS]: ['service.name', 'service.environment'],
      },
      {
        [ENTITY_TYPE]: 'host' as EntityType,
        [ENTITY_IDENTITY_FIELDS]: 'host.name',
      },
      {
        [ENTITY_TYPE]: 'container' as EntityType,
        [ENTITY_IDENTITY_FIELDS]: 'contaier.id',
      },
    ];
    const result = getIdentityFieldsPerEntityType(mockEntities);

    expect(result.size).toBe(3);

    expect(result.get('service')).toEqual(['service.name', 'service.environment']);
    expect(result.get('host')).toEqual(['host.name']);
    expect(result.get('container')).toEqual(['contaier.id']);
  });
});

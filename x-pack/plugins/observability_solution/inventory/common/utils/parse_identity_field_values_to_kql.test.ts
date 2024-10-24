/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_ID,
  ENTITY_LAST_SEEN,
} from '@kbn/observability-shared-plugin/common';
import { HostEntity, ServiceEntity } from '../entities';
import { parseIdentityFieldValuesToKql } from './parse_identity_field_values_to_kql';

const commonEntityFields = {
  [ENTITY_LAST_SEEN]: '2023-10-09T00:00:00Z',
  [ENTITY_ID]: '1',
  [ENTITY_DISPLAY_NAME]: 'entity_name',
  [ENTITY_DEFINITION_ID]: 'entity_definition_id',
  alertCount: 3,
};

describe('parseIdentityFieldValuesToKql', () => {
  it('should return the value when identityFields is a single string', () => {
    const entity: ServiceEntity = {
      'agent.name': 'node',
      'entity.identity_fields': 'service.name',
      'service.name': 'my-service',
      'entity.type': 'service',
      ...commonEntityFields,
    };

    const result = parseIdentityFieldValuesToKql({ entity });
    expect(result).toEqual('service.name: "my-service"');
  });

  it('should return values when identityFields is an array of strings', () => {
    const entity: ServiceEntity = {
      'agent.name': 'node',
      'entity.identity_fields': ['service.name', 'service.environment'],
      'service.name': 'my-service',
      'entity.type': 'service',
      'service.environment': 'staging',
      ...commonEntityFields,
    };

    const result = parseIdentityFieldValuesToKql({ entity });
    expect(result).toEqual('service.name: "my-service" AND service.environment: "staging"');
  });

  it('should return an empty string if identityFields is empty string', () => {
    const entity: ServiceEntity = {
      'agent.name': 'node',
      'entity.identity_fields': '',
      'service.name': 'my-service',
      'entity.type': 'service',
      ...commonEntityFields,
    };

    const result = parseIdentityFieldValuesToKql({ entity });
    expect(result).toEqual('');
  });
  it('should return an empty array if identityFields is empty array', () => {
    const entity: ServiceEntity = {
      'agent.name': 'node',
      'entity.identity_fields': [],
      'service.name': 'my-service',
      'entity.type': 'service',
      ...commonEntityFields,
    };

    const result = parseIdentityFieldValuesToKql({ entity });
    expect(result).toEqual('');
  });

  it('should ignore fields that are not present in the entity', () => {
    const entity: HostEntity = {
      'entity.identity_fields': ['host.name', 'foo.bar'],
      'host.name': 'my-host',
      'entity.type': 'host',
      'cloud.provider': null,
      ...commonEntityFields,
    };

    const result = parseIdentityFieldValuesToKql({ entity });
    expect(result).toEqual('host.name: "my-host"');
  });
});

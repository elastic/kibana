/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityClient } from './entity_client';
import { coreMock } from '@kbn/core/public/mocks';
import type { EntityInstance } from '@kbn/entities-schema';

const commonEntityFields: EntityInstance = {
  entity: {
    last_seen_timestamp: '2023-10-09T00:00:00Z',
    id: '1',
    display_name: 'entity_name',
    definition_id: 'entity_definition_id',
  } as EntityInstance['entity'],
};

describe('EntityClient', () => {
  let entityClient: EntityClient;

  beforeEach(() => {
    entityClient = new EntityClient(coreMock.createStart());
  });

  describe('asKqlFilter', () => {
    it('should return the kql filter', () => {
      const entityLatest: EntityInstance = {
        entity: {
          ...commonEntityFields.entity,
          identity_fields: ['service.name', 'service.environment'],
          type: 'service',
        },
        service: {
          name: 'my-service',
        },
      };

      const result = entityClient.asKqlFilter(entityLatest);
      expect(result).toEqual('service.name: "my-service"');
    });

    it('should return the kql filter when an indentity field value contain special characters', () => {
      const entityLatest: EntityInstance = {
        entity: {
          ...commonEntityFields.entity,
          identity_fields: ['host.name', 'foo.bar'],
        },
        host: {
          name: 'my-host:some-value:some-other-value',
        },
      };

      const result = entityClient.asKqlFilter(entityLatest);
      expect(result).toEqual('host.name: "my-host:some-value:some-other-value"');
    });

    it('should return the kql filter when indentity_fields is composed by multiple fields', () => {
      const entityLatest: EntityInstance = {
        entity: {
          ...commonEntityFields.entity,
          identity_fields: ['service.name', 'service.environment'],
          type: 'service',
        },
        service: {
          name: 'my-service',
          environment: 'staging',
        },
      };

      const result = entityClient.asKqlFilter(entityLatest);
      expect(result).toEqual('(service.name: "my-service" AND service.environment: "staging")');
    });

    it('should ignore fields that are not present in the entity', () => {
      const entityLatest: EntityInstance = {
        entity: {
          ...commonEntityFields.entity,
          identity_fields: ['host.name', 'foo.bar'],
        },
        host: {
          name: 'my-host',
        },
      };

      const result = entityClient.asKqlFilter(entityLatest);
      expect(result).toEqual('host.name: "my-host"');
    });
  });

  describe('getIdentityFieldsValue', () => {
    it('should return identity fields values', () => {
      const entityLatest: EntityInstance = {
        entity: {
          ...commonEntityFields.entity,
          identity_fields: ['service.name', 'service.environment'],
          type: 'service',
        },
        service: {
          name: 'my-service',
        },
      };

      expect(entityClient.getIdentityFieldsValue(entityLatest)).toEqual({
        'service.name': 'my-service',
      });
    });

    it('should return identity fields values when indentity_fields is composed by multiple fields', () => {
      const entityLatest: EntityInstance = {
        entity: {
          ...commonEntityFields.entity,
          identity_fields: ['service.name', 'service.environment'],
          type: 'service',
        },
        service: {
          name: 'my-service',
          environment: 'staging',
        },
      };

      expect(entityClient.getIdentityFieldsValue(entityLatest)).toEqual({
        'service.name': 'my-service',
        'service.environment': 'staging',
      });
    });

    it('should return identity fields when field is in the root', () => {
      const entityLatest: EntityInstance = {
        entity: {
          ...commonEntityFields.entity,
          identity_fields: ['name'],
          type: 'service',
        },
        name: 'foo',
      };

      expect(entityClient.getIdentityFieldsValue(entityLatest)).toEqual({
        name: 'foo',
      });
    });

    it('should throw an error when identity fields are missing', () => {
      const entityLatest: EntityInstance = {
        ...commonEntityFields,
      };

      expect(() => entityClient.getIdentityFieldsValue(entityLatest)).toThrow(
        'Identity fields are missing'
      );
    });
  });
});

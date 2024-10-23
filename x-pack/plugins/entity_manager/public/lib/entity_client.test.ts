/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityClient, EntityLatest } from './entity_client';
import { coreMock } from '@kbn/core/public/mocks';

const commonEntityFields: EntityLatest = {
  agent: {
    name: 'node',
  },
  entity: {
    lastSeenTimestamp: '2023-10-09T00:00:00Z',
    id: '1',
    displayName: 'entity_name',
    definitionId: 'entity_definition_id',
  } as EntityLatest['entity'],
};

describe('EntityClient', () => {
  let entityClient: EntityClient;

  beforeEach(() => {
    entityClient = new EntityClient(coreMock.createStart());
  });

  describe('asKqlFilter', () => {
    it('should return the value when identityFields is a single string', () => {
      const entityLatest: EntityLatest = {
        ...commonEntityFields,
        entity: {
          ...commonEntityFields.entity,
          identityFields: ['service.name', 'service.environment'],
          type: 'service',
        },
        service: {
          name: 'my-service',
        },
      };

      const result = entityClient.asKqlFilter(entityLatest);
      expect(result).toEqual('service.name: my-service');
    });

    it('should return values when identityFields is an array of strings', () => {
      const entityLatest: EntityLatest = {
        ...commonEntityFields,
        entity: {
          ...commonEntityFields.entity,
          identityFields: ['service.name', 'service.environment'],
          type: 'service',
        },
        service: {
          name: 'my-service',
          environment: 'staging',
        },
      };

      const result = entityClient.asKqlFilter(entityLatest);
      expect(result).toEqual('(service.name: my-service AND service.environment: staging)');
    });

    it('should throw an error when identity fields are missing', () => {
      const entityLatest: EntityLatest = {
        ...commonEntityFields,
      };

      expect(() => entityClient.asKqlFilter(entityLatest)).toThrow('Identity fields are missing');
    });

    it('should ignore fields that are not present in the entity', () => {
      const entityLatest: EntityLatest = {
        ...commonEntityFields,
        entity: {
          ...commonEntityFields.entity,
          identityFields: ['host.name', 'foo.bar'],
        },
        host: {
          name: 'my-host',
        },
      };

      const result = entityClient.asKqlFilter(entityLatest);
      expect(result).toEqual('host.name: my-host');
    });
  });

  describe('getIdentityFieldsValue', () => {
    it('should return identity fields values', () => {
      const serviceEntity: EntityLatest = {
        ...commonEntityFields,
        entity: {
          ...commonEntityFields.entity,
          identityFields: ['service.name', 'service.environment'],
          type: 'service',
        },
        service: {
          name: 'my-service',
        },
      };

      expect(entityClient.getIdentityFieldsValue(serviceEntity)).toEqual({
        'service.name': 'my-service',
      });
    });

    it('should return identity fields values when indentity field is an array of string', () => {
      const serviceEntity: EntityLatest = {
        ...commonEntityFields,
        entity: {
          ...commonEntityFields.entity,
          identityFields: ['service.name', 'service.environment'],
          type: 'service',
        },
        service: {
          name: 'my-service',
          environment: 'staging',
        },
      };

      expect(entityClient.getIdentityFieldsValue(serviceEntity)).toEqual({
        'service.name': 'my-service',
        'service.environment': 'staging',
      });
    });

    it('should return identity fields when field is in the root', () => {
      const serviceEntity: EntityLatest = {
        ...commonEntityFields,
        entity: {
          ...commonEntityFields.entity,
          identityFields: ['name'],
          type: 'service',
        },
        name: 'foo',
      };

      expect(entityClient.getIdentityFieldsValue(serviceEntity)).toEqual({
        name: 'foo',
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Ecs } from '../../../../../../graphql/types';
import { canBeUsedToQueryResolverAPIs } from './ecs';

describe('`canBeUsedToQueryResolverAPIs`:', () => {
  let ecs: Ecs;
  describe('when called with an ECS document which represents a process, and which has an entity_id', () => {
    beforeEach(() => {
      ecs = {
        event: {
          category: ['process'],
          kind: ['event'],
        },
        process: {
          entity_id: '',
        },
        // Cast this to Ecs, even though it is partial. We define the fields that are needed by the implementation
      } as Ecs;
    });
    it('should return `true`', () => {
      expect(canBeUsedToQueryResolverAPIs(ecs)).toBe(true);
    });
  });
  describe('when called with an ECS document that represents a file alert (which has a process entity_id)', () => {
    beforeEach(() => {
      ecs = {
        event: {
          category: ['file'],
          kind: ['alert'],
        },
        process: {
          entity_id: '',
        },
        // Cast this to Ecs, even though it is partial. We define the fields that are needed by the implementation
      } as Ecs;
    });
    it('should return `false`', () => {
      // TODO, is this the expected behavior?
      // maybe we should try to show resolver for any ECS
      // object which has a process entity id.
      expect(canBeUsedToQueryResolverAPIs(ecs)).toBe(false);
    });
  });
});

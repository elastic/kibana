/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { isInvestigateInResolverActionEnabled } from './investigate_in_resolver';

describe('InvestigateInResolverAction', () => {
  describe('isInvestigateInResolverActionEnabled', () => {
    it('returns false if agent.type does not equal endpoint', () => {
      const data: Ecs = { _id: '1', agent: { type: ['blah'] } };

      expect(isInvestigateInResolverActionEnabled(data)).toBeFalsy();
    });

    it('returns false if agent.type does not have endpoint in first array index', () => {
      const data: Ecs = { _id: '1', agent: { type: ['blah', 'endpoint'] } };

      expect(isInvestigateInResolverActionEnabled(data)).toBeFalsy();
    });

    it('returns false if process.entity_id is not defined', () => {
      const data: Ecs = { _id: '1', agent: { type: ['endpoint'] } };

      expect(isInvestigateInResolverActionEnabled(data)).toBeFalsy();
    });

    it('returns true if agent.type has endpoint in first array index', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['endpoint', 'blah'] },
        process: { entity_id: ['5'] },
      };

      expect(isInvestigateInResolverActionEnabled(data)).toBeTruthy();
    });

    it('returns false if multiple entity_ids', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['endpoint', 'blah'] },
        process: { entity_id: ['5', '10'] },
      };

      expect(isInvestigateInResolverActionEnabled(data)).toBeFalsy();
    });

    it('returns false if entity_id is an empty string', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['endpoint', 'blah'] },
        process: { entity_id: [''] },
      };

      expect(isInvestigateInResolverActionEnabled(data)).toBeFalsy();
    });
  });
});

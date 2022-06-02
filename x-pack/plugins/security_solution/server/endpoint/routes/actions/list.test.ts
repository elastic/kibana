/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

import { AgentsActionsLogRequestSchema } from '../../../../common/endpoint/schema/actions';

describe('Agents actions log API', () => {
  describe('Schema', () => {
    it('should require agent_ids', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.params.validate({}); // no agent_ids provided
      }).toThrow();
    });

    it('should require at least 1 agent ID', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.params.validate({ agent_ids: [] }); // no agent_ids provided
      }).toThrow();
    });

    it('should not accept a single agent ID if not in an array', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.params.validate({ agent_ids: uuid.v4() });
      }).toThrow();
    });

    it('should accept a single agent ID in an array', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.params.validate({ agent_ids: [uuid.v4()] });
      }).not.toThrow();
    });

    it('should accept multiple agent IDs in an array', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.params.validate({
          agent_ids: [uuid.v4(), uuid.v4(), uuid.v4()],
        });
      }).not.toThrow();
    });

    it('should limit multiple agent IDs in an array to 50', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.params.validate({
          agent_ids: Array(51).fill(uuid.v4()),
        });
      }).toThrow();
    });

    it('should not work when no query params', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({});
      }).toThrow();
    });

    it('should work with all required query params', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
        });
      }).not.toThrow();
    });

    it('should not work without endDate', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 1,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        });
      }).toThrow();
    });

    it('should not work without startDate', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 1,
          page_size: 100,
          end_date: new Date().toISOString(), // today
        });
      }).toThrow();
    });

    it('should not work without allowed page and page_size params', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({ page_size: 101 });
      }).toThrow();
    });

    it('should not work without valid userIds', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
          user_ids: [],
        });
      }).toThrow();
    });

    it('should work with a single userIds query params', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
          user_ids: ['elastic'],
        });
      }).not.toThrow();
    });

    it('should work with multiple userIds query params', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
          user_ids: ['elastic', 'fleet'],
        });
      }).not.toThrow();
    });

    it('should limit multiple userIds to 20', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
          user_ids: Array(21).fill(uuid.v4()),
        });
      }).toThrow();
    });

    it('should work with action_type query params with a single action type', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
          action_types: ['isolate'],
        });
      }).not.toThrow();
    });

    it('should not work with action_type query params with empty array', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
          action_types: [],
        });
      }).toThrow();
    });

    it('should work with action_type query params with multiple types', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
          action_types: ['isolate', 'unisolate'],
        });
      }).not.toThrow();
    });

    it('should limit action_type query params to a max of 10', () => {
      expect(() => {
        AgentsActionsLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
          action_types: [
            'isolate',
            'unisolate',
            'three',
            'four',
            'five',
            'six',
            'seven',
            'eight',
            'nine',
            'ten',
            'not allowed',
          ],
        });
      }).toThrow();
    });
  });
});

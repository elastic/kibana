/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

import {
  EndpointActionListRequestSchema,
  HostIsolationRequestSchema,
  KillProcessRequestSchema,
} from './actions';

describe('actions schemas', () => {
  describe('Endpoint action list API Schema', () => {
    it('should work without any query keys ', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({}); // no agent_ids provided
      }).not.toThrow();
    });

    it('should require at least 1 agent ID', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ agentIds: [] }); // no agent_ids provided
      }).toThrow();
    });

    it('should not accept an agent ID if not in an array', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ agentIds: uuid.v4() });
      }).toThrow();
    });

    it('should accept an agent ID in an array', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ agentIds: [uuid.v4()] });
      }).not.toThrow();
    });

    it('should accept multiple agent IDs in an array', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          agentIds: [uuid.v4(), uuid.v4(), uuid.v4()],
        });
      }).not.toThrow();
    });

    it('should limit multiple agent IDs in an array to 50', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          agentIds: Array(51)
            .fill(1)
            .map(() => uuid.v4()),
        });
      }).toThrow();
    });

    it('should work with all required query params', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          page: 10,
          pageSize: 100,
          startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          endDate: new Date().toISOString(), // today
        });
      }).not.toThrow();
    });

    it('should not work without allowed page and pageSize params', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ pageSize: 101 });
      }).toThrow();
    });

    it('should not work without valid userIds', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          page: 10,
          pageSize: 100,
          startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          endDate: new Date().toISOString(), // today
          userIds: [],
        });
      }).toThrow();
    });

    it('should work with a single userIds query params', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          page: 10,
          pageSize: 100,
          startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          endDate: new Date().toISOString(), // today
          userIds: ['elastic'],
        });
      }).not.toThrow();
    });

    it('should work with multiple userIds query params', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          page: 10,
          pageSize: 100,
          startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          endDate: new Date().toISOString(), // today
          userIds: ['elastic', 'fleet'],
        });
      }).not.toThrow();
    });

    it('should work with commands query params with a single action type', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          page: 10,
          pageSize: 100,
          startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          endDate: new Date().toISOString(), // today
          commands: ['isolate'],
        });
      }).not.toThrow();
    });

    it('should not work with commands query params with empty array', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          page: 10,
          pageSize: 100,
          startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          endDate: new Date().toISOString(), // today
          commands: [],
        });
      }).toThrow();
    });

    it('should work with commands query params with multiple types', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          page: 10,
          pageSize: 100,
          startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          endDate: new Date().toISOString(), // today
          commands: ['isolate', 'unisolate'],
        });
      }).not.toThrow();
    });
  });

  describe('HostIsolationRequestSchema', () => {
    it('should require at least 1 Endpoint ID', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should accept an Endpoint ID as the only required field', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
        });
      }).not.toThrow();
    });

    it('should accept a comment', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
        });
      }).not.toThrow();
    });

    it('should accept alert IDs', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          alert_ids: ['0000000-000-00'],
        });
      }).not.toThrow();
    });

    it('should accept case IDs', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          case_ids: ['000000000-000-000'],
        });
      }).not.toThrow();
    });
  });

  describe('KillProcessRequestSchema', () => {
    it('should require at least 1 Endpoint ID', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should accept pid', () => {
      expect(() => {
        KillProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            pid: 1234,
          },
        });
      }).not.toThrow();
    });

    it('should accept entity_id', () => {
      expect(() => {
        KillProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            entity_id: 5678,
          },
        });
      }).not.toThrow();
    });

    it('should reject pid and entity_id together', () => {
      expect(() => {
        KillProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            pid: 1234,
            entity_id: 5678,
          },
        });
      }).toThrow();
    });

    it('should reject if no pid or entity_id', () => {
      expect(() => {
        KillProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
          parameters: {},
        });
      }).toThrow();
    });

    it('should accept a comment', () => {
      expect(() => {
        KillProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
          parameters: {
            pid: 1234,
          },
        });
      }).not.toThrow();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';

import {
  EndpointActionListRequestSchema,
  NoParametersRequestSchema,
  KillOrSuspendProcessRequestSchema,
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

    it('should accept an agent ID if not in an array', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ agentIds: uuid() });
      }).not.toThrow();
    });

    it('should accept an agent ID in an array', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ agentIds: [uuid()] });
      }).not.toThrow();
    });

    it('should accept multiple agent IDs in an array', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          agentIds: [uuid(), uuid(), uuid()],
        });
      }).not.toThrow();
    });

    it('should not limit multiple agent IDs', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          agentIds: Array(255)
            .fill(1)
            .map(() => uuid()),
        });
      }).not.toThrow();
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

    it('should not work with invalid value for `page` query param', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ page: -1 });
      }).toThrow();
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ page: 0 });
      }).toThrow();
    });

    it('should not work with invalid value for `pageSize` query param', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ pageSize: 100001 });
      }).toThrow();
      expect(() => {
        EndpointActionListRequestSchema.query.validate({ pageSize: 0 });
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

    it.each(['isolate', 'unisolate', 'kill-process', 'suspend-process', 'running-processes'])(
      'should work with commands query params with %s action',
      (command) => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            commands: command,
          });
        }).not.toThrow();
      }
    );

    it('should work with commands query params with a single action type in a list', () => {
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

    it('should work with at least one `status` filter in a list', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          startDate: 'now-1d', // yesterday
          endDate: 'now', // today
          statuses: ['failed'],
        });
      }).not.toThrow();
    });

    it.each(['failed', 'pending', 'successful'])('should work alone with %s filter', (status) => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          startDate: 'now-1d', // yesterday
          endDate: 'now', // today
          statuses: status,
        });
      }).not.toThrow();
    });

    it('should not work with empty list for `status` filter', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          startDate: 'now-1d', // yesterday
          endDate: 'now', // today
          statuses: [],
        });
      }).toThrow();
    });

    it('should not work with more than allowed list for `status` filter', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          startDate: 'now-1d', // yesterday
          endDate: 'now', // today
          statuses: ['failed', 'pending', 'successful', 'xyz'],
        });
      }).toThrow();
    });

    it('should not work with any string for `status` filter', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          startDate: 'now-1d', // yesterday
          endDate: 'now', // today
          statuses: ['xyz', 'pqr', 'abc'],
        });
      }).toThrow();
    });

    it('should work with at multiple `status` filter', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          startDate: 'now-1d', // yesterday
          endDate: 'now', // today
          statuses: ['failed', 'pending', 'successful'],
        });
      }).not.toThrow();
    });
  });

  describe('NoParametersRequestSchema', () => {
    it('should require at least 1 Endpoint ID', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should accept an Endpoint ID as the only required field', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
        });
      }).not.toThrow();
    });

    it('should accept a comment', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
        });
      }).not.toThrow();
    });

    it('should accept alert IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          alert_ids: ['0000000-000-00'],
        });
      }).not.toThrow();
    });

    it('should accept case IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          case_ids: ['000000000-000-000'],
        });
      }).not.toThrow();
    });
  });

  describe('KillOrSuspendProcessRequestSchema', () => {
    it('should require at least 1 Endpoint ID', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should accept pid', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            pid: 1234,
          },
        });
      }).not.toThrow();
    });

    it('should accept entity_id', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            entity_id: 'abc123',
          },
        });
      }).not.toThrow();
    });

    it('should reject pid and entity_id together', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            pid: 1234,
            entity_id: 'abc123',
          },
        });
      }).toThrow();
    });

    it('should reject if no pid or entity_id', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
          parameters: {},
        });
      }).toThrow();
    });

    it('should accept a comment', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
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

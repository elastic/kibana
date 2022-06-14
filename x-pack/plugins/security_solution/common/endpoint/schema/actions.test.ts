/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostIsolationRequestSchema, KillProcessRequestSchema } from './actions';

describe('actions schemas', () => {
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

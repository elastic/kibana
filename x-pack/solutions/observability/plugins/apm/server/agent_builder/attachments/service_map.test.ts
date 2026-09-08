/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServiceMapAttachmentType } from './service_map';
import { SERVICE_MAP_ATTACHMENT_TYPE } from '../../../common/agent_builder/attachments';

describe('createServiceMapAttachmentType', () => {
  const attachmentType = createServiceMapAttachmentType();

  it('exposes the correct attachment type id', () => {
    expect(attachmentType.id).toBe(SERVICE_MAP_ATTACHMENT_TYPE);
  });

  const minimalConnection = {
    source: { 'service.name': 'frontend' },
    target: { 'service.name': 'backend' },
    metrics: undefined,
  };

  describe('validate', () => {
    it('accepts a valid payload with one connection', () => {
      const result = attachmentType.validate({ connections: [minimalConnection] });
      expect(result.valid).toBe(true);
    });

    it('rejects an empty connections array', () => {
      const result = attachmentType.validate({ connections: [] });
      expect(result.valid).toBe(false);
    });

    it('rejects a payload without connections', () => {
      const result = attachmentType.validate({});
      expect(result.valid).toBe(false);
    });

    it('accepts a connection where span.type and span.subtype are absent (bug-fix)', () => {
      const connectionWithExternalNodeMissingSubtype = {
        source: { 'service.name': 'frontend' },
        target: {
          'span.destination.service.resource': 'postgresql:5432',
          // span.type and span.subtype intentionally omitted
        },
        metrics: undefined,
      };
      const result = attachmentType.validate({
        connections: [connectionWithExternalNodeMissingSubtype],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts a connection where span.type is present but span.subtype is absent', () => {
      const result = attachmentType.validate({
        connections: [
          {
            source: { 'service.name': 'a' },
            target: {
              'span.destination.service.resource': 'redis:6379',
              'span.type': 'cache',
            },
            metrics: undefined,
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts nodeMetadata with alert/SLO/anomaly fields', () => {
      const result = attachmentType.validate({
        connections: [minimalConnection],
        nodeMetadata: {
          frontend: {
            alertsCount: 2,
            sloStatus: 'violated',
            sloCount: 3,
            anomalySeverity: 'critical',
            anomalyScore: 95,
          },
        },
      });
      expect(result.valid).toBe(true);
    });

    it('accepts nodeMetadata with only some fields present', () => {
      const result = attachmentType.validate({
        connections: [minimalConnection],
        nodeMetadata: {
          frontend: { alertsCount: 1 },
        },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects nodeMetadata with an invalid sloStatus value', () => {
      const result = attachmentType.validate({
        connections: [minimalConnection],
        nodeMetadata: {
          frontend: { sloStatus: 'unknown-value' },
        },
      });
      expect(result.valid).toBe(false);
    });

    it('accepts nodeMetadata omitted entirely', () => {
      const result = attachmentType.validate({
        connections: [minimalConnection],
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.nodeMetadata).toBeUndefined();
      }
    });
  });

  describe('format', () => {
    it('returns a text representation with connections and nodeMetadata', () => {
      const data = {
        connections: [minimalConnection],
        nodeMetadata: { frontend: { alertsCount: 1 } },
      };
      if (!attachmentType.validate(data).valid) throw new Error('pre-condition failed');
      const representation = attachmentType
        .format({ id: 'test', type: attachmentType.id, data })
        .getRepresentation();
      expect(representation.type).toBe('text');
      const parsed = JSON.parse(representation.value as string);
      expect(parsed.nodeMetadata).toEqual({ frontend: { alertsCount: 1 } });
    });
  });

  describe('getAgentDescription', () => {
    it('mentions badge metadata fields', () => {
      const description = attachmentType.getAgentDescription();
      expect(description).toContain('alertsCount');
      expect(description).toContain('sloStatus');
      expect(description).toContain('nodeMetadata');
    });
  });
});

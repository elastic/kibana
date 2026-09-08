/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServiceMapContextAttachmentType } from './service_map_context';
import { SERVICE_MAP_CONTEXT_ATTACHMENT_TYPE } from '../../../common/agent_builder/attachments';

describe('createServiceMapContextAttachmentType', () => {
  const attachmentType = createServiceMapContextAttachmentType();

  it('exposes the correct attachment type id', () => {
    expect(attachmentType.id).toBe(SERVICE_MAP_CONTEXT_ATTACHMENT_TYPE);
  });

  describe('validate', () => {
    const fullPayload = {
      timeRange: { from: 'now-1h', to: 'now' },
      environment: 'production',
      kuery: 'service.name: "frontend"',
      serviceGroupId: 'sg-1',
      highlightedServiceNames: ['frontend', 'checkout'],
    };

    it('accepts a valid full payload', () => {
      const result = attachmentType.validate(fullPayload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toMatchObject(fullPayload);
      }
    });

    it('accepts a minimal payload (only timeRange)', () => {
      const result = attachmentType.validate({ timeRange: { from: 'now-2h', to: 'now' } });
      expect(result.valid).toBe(true);
    });

    it('rejects a payload missing timeRange', () => {
      const result = attachmentType.validate({ environment: 'production' });
      expect(result.valid).toBe(false);
    });

    it('rejects a payload with missing timeRange.from', () => {
      const result = attachmentType.validate({ timeRange: { to: 'now' } });
      expect(result.valid).toBe(false);
    });

    it('rejects a string exceeding MAX_LABEL_LENGTH (1024) in environment', () => {
      const result = attachmentType.validate({
        timeRange: { from: 'now-1h', to: 'now' },
        environment: 'x'.repeat(1025),
      });
      expect(result.valid).toBe(false);
    });

    it('rejects highlightedServiceNames exceeding MAX_HIGHLIGHTED_SERVICES (50)', () => {
      const result = attachmentType.validate({
        timeRange: { from: 'now-1h', to: 'now' },
        highlightedServiceNames: Array.from({ length: 51 }, (_, i) => `service-${i}`),
      });
      expect(result.valid).toBe(false);
    });

    it('accepts highlightedServiceNames at the limit (50)', () => {
      const result = attachmentType.validate({
        timeRange: { from: 'now-1h', to: 'now' },
        highlightedServiceNames: Array.from({ length: 50 }, (_, i) => `service-${i}`),
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('format', () => {
    it('returns a text representation containing the serialised attachment data', () => {
      const data = { timeRange: { from: 'now-1h', to: 'now' }, environment: 'production' };
      if (!attachmentType.validate(data).valid) throw new Error('pre-condition failed');
      const representation = attachmentType.format({ id: 'test', type: attachmentType.id, data }).getRepresentation();
      expect(representation.type).toBe('text');
      expect(JSON.parse(representation.value as string)).toMatchObject(data);
    });
  });

  describe('getAgentDescription', () => {
    it('mentions that this attachment contains only view filters, not topology data', () => {
      const description = attachmentType.getAgentDescription();
      expect(description).toContain('view filters');
      expect(description).toContain('NOT topology data');
    });
  });

  describe('getTools', () => {
    it('returns an empty array (no tools contributed by this attachment)', () => {
      expect(attachmentType.getTools()).toEqual([]);
    });
  });
});

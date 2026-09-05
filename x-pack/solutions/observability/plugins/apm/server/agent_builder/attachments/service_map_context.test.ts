/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServiceMapContextAttachmentType } from './service_map_context';

// Minimal stub for AttachmentFormatContext
const mockContext = {} as any;

describe('createServiceMapContextAttachmentType', () => {
  const type = createServiceMapContextAttachmentType();

  it('has the correct id', () => {
    expect(type.id).toBe('observability.service-map-context');
  });

  describe('validate', () => {
    it('accepts a payload with only a time range', async () => {
      const result = await type.validate({
        timeRange: { from: 'now-15m', to: 'now' },
      });
      expect(result.valid).toBe(true);
    });

    it('accepts a full context payload', async () => {
      const result = await type.validate({
        timeRange: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-01T01:00:00.000Z' },
        environment: 'production',
        kuery: 'service.name : "checkout"',
        serviceGroupId: 'group-1',
        highlightedServiceNames: ['checkout', 'payment'],
      });
      expect(result.valid).toBe(true);
    });

    it('rejects a payload without a time range', async () => {
      const result = await type.validate({ environment: 'production' });
      expect(result.valid).toBe(false);
    });

    it('rejects more than 50 highlighted services', async () => {
      const result = await type.validate({
        timeRange: { from: 'now-15m', to: 'now' },
        highlightedServiceNames: Array.from({ length: 51 }, (_, i) => `service-${i}`),
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('represents the data as JSON text', async () => {
      const data = {
        timeRange: { from: 'now-15m', to: 'now' },
        environment: 'production',
      };
      const formatted = await type.format({ id: 'att-1', type: type.id, data } as any, mockContext);
      const representation = await formatted.getRepresentation?.();
      expect(representation?.type).toBe('text');
      if (representation?.type === 'text') {
        expect(JSON.parse(representation.value)).toEqual(data);
      }
    });
  });
});

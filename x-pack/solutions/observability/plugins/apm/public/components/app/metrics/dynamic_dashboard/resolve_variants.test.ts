/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { PanelSlot } from './types';
import { checkFieldExistence, resolveVariants } from './use_resolved_panels';

const makePanelSlot = (overrides: Partial<PanelSlot> = {}): PanelSlot => ({
  id: 'test-panel',
  title: 'Test Panel',
  gridConfig: { x: 0, y: 0, w: 24, h: 15 },
  variants: [],
  ...overrides,
});

describe('variant resolution', () => {
  describe('field existence filtering', () => {
    it('keeps variants whose required fields exist in the data view', () => {
      const dataView = {
        getFieldByName: (name: string) => {
          const fields: Record<string, object> = {
            'jvm.cpu.recent_utilization': { name: 'jvm.cpu.recent_utilization' },
          };
          return fields[name];
        },
      } as unknown as DataView;

      const slot = makePanelSlot({
        variants: [
          {
            id: 'semconv',
            requiredFields: ['jvm.cpu.recent_utilization'],
            config: { type: 'xy' } as any,
          },
          {
            id: 'ecs',
            requiredFields: ['system.process.cpu.total.norm.pct'],
            config: { type: 'xy' } as any,
          },
        ],
      });

      const result = checkFieldExistence([slot], dataView);
      expect(result).toHaveLength(1);
      expect(result[0].variants).toHaveLength(1);
      expect(result[0].variants[0].id).toBe('semconv');
    });

    it('removes slots with no surviving variants', () => {
      const dataView = {
        getFieldByName: () => undefined,
      } as unknown as DataView;

      const slot = makePanelSlot({
        variants: [
          {
            id: 'semconv',
            requiredFields: ['nonexistent.field'],
            config: { type: 'xy' } as any,
          },
        ],
      });

      const result = checkFieldExistence([slot], dataView);
      expect(result).toHaveLength(0);
    });

    it('keeps variants that require multiple fields when all exist', () => {
      const dataView = {
        getFieldByName: (name: string) => {
          const fields: Record<string, object> = {
            'jvm.memory.used': { name: 'jvm.memory.used' },
            'jvm.memory.type': { name: 'jvm.memory.type' },
          };
          return fields[name];
        },
      } as unknown as DataView;

      const slot = makePanelSlot({
        variants: [
          {
            id: 'semconv',
            requiredFields: ['jvm.memory.used', 'jvm.memory.type'],
            config: { type: 'xy' } as any,
          },
        ],
      });

      const result = checkFieldExistence([slot], dataView);
      expect(result).toHaveLength(1);
      expect(result[0].variants[0].id).toBe('semconv');
    });
  });

  describe('variant selection', () => {
    it('selects first variant whose fields all have data', () => {
      const slots: PanelSlot[] = [
        makePanelSlot({
          id: 'cpu',
          variants: [
            {
              id: 'semconv',
              requiredFields: ['jvm.cpu.recent_utilization'],
              config: { type: 'xy' } as any,
            },
            {
              id: 'ecs',
              requiredFields: ['system.process.cpu.total.norm.pct'],
              config: { type: 'xy' } as any,
            },
          ],
        }),
      ];

      const result = resolveVariants(slots, {
        'jvm.cpu.recent_utilization': true,
        'system.process.cpu.total.norm.pct': true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].variantId).toBe('semconv');
    });

    it('falls back to second variant when first has no data', () => {
      const slots: PanelSlot[] = [
        makePanelSlot({
          id: 'cpu',
          variants: [
            {
              id: 'semconv',
              requiredFields: ['jvm.cpu.recent_utilization'],
              config: { type: 'xy' } as any,
            },
            {
              id: 'ecs',
              requiredFields: ['system.process.cpu.total.norm.pct'],
              config: { type: 'xy' } as any,
            },
          ],
        }),
      ];

      const result = resolveVariants(slots, {
        'jvm.cpu.recent_utilization': false,
        'system.process.cpu.total.norm.pct': true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].variantId).toBe('ecs');
    });

    it('skips slot when no variant has data', () => {
      const slots: PanelSlot[] = [
        makePanelSlot({
          id: 'cpu',
          variants: [
            {
              id: 'semconv',
              requiredFields: ['jvm.cpu.recent_utilization'],
              config: { type: 'xy' } as any,
            },
          ],
        }),
      ];

      const result = resolveVariants(slots, {
        'jvm.cpu.recent_utilization': false,
      });

      expect(result).toHaveLength(0);
    });

    it('resolves multiple slots independently', () => {
      const slots: PanelSlot[] = [
        makePanelSlot({
          id: 'cpu',
          variants: [
            {
              id: 'semconv',
              requiredFields: ['jvm.cpu.recent_utilization'],
              config: { type: 'xy' } as any,
            },
          ],
        }),
        makePanelSlot({
          id: 'memory',
          variants: [
            {
              id: 'semconv',
              requiredFields: ['jvm.memory.used'],
              config: { type: 'xy' } as any,
            },
          ],
        }),
      ];

      const result = resolveVariants(slots, {
        'jvm.cpu.recent_utilization': true,
        'jvm.memory.used': false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cpu');
    });
  });
});

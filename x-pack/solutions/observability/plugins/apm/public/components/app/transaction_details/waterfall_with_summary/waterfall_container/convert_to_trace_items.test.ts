/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENT_OUTCOME } from '@kbn/apm-types';
import { convertToTraceItems } from './convert_to_trace_items';
import type {
  IWaterfall,
  IWaterfallError,
  IWaterfallSpan,
  IWaterfallTransaction,
} from './waterfall/waterfall_helpers/waterfall_helpers';
import type {
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../../../../common/waterfall/typings';
import { WaterfallLegendType } from '../../../../../../common/waterfall/legend';

const createMockSpanDoc = (overrides: Partial<WaterfallSpan> = {}): WaterfallSpan => ({
  timestamp: { us: 1000000 },
  trace: { id: 'trace-1' },
  service: { name: 'test-service' },
  agent: { name: 'nodejs' },
  processor: { event: 'span' },
  span: {
    id: 'span-1',
    type: 'external',
    name: 'GET /api',
    duration: { us: 1000 },
  },
  ...overrides,
});

const createMockTransactionDoc = (
  overrides: Partial<WaterfallTransaction> = {}
): WaterfallTransaction => ({
  timestamp: { us: 1000000 },
  trace: { id: 'trace-1' },
  service: { name: 'test-service' },
  agent: { name: 'nodejs' },
  processor: { event: 'transaction' },
  transaction: {
    id: 'tx-1',
    type: 'request',
    name: 'GET /api',
    duration: { us: 5000 },
  },
  ...overrides,
});

/**
 * Creates a mock span item with separate overrides for document and item properties.
 * @param docOverrides - Overrides for the WaterfallSpan document
 * @param itemOverrides - Overrides for the IWaterfallSpan item properties (excluding doc and docType)
 */
const createMockSpanItem = (
  docOverrides: Partial<WaterfallSpan> = {},
  itemOverrides: Partial<Omit<IWaterfallSpan, 'doc' | 'docType'>> = {}
): IWaterfallSpan => ({
  docType: 'span',
  doc: createMockSpanDoc(docOverrides),
  id: 'span-1',
  duration: 1000,
  offset: 0,
  skew: 0,
  legendValues: { serviceName: 'test-service', type: 'external' },
  color: '#000',
  spanLinksCount: { linkedChildren: 0, linkedParents: 0 },
  ...itemOverrides,
});

/**
 * Creates a mock transaction item with separate overrides for document and item properties.
 * @param docOverrides - Overrides for the WaterfallTransaction document
 * @param itemOverrides - Overrides for the IWaterfallTransaction item properties (excluding doc and docType)
 */
const createMockTransactionItem = (
  docOverrides: Partial<WaterfallTransaction> = {},
  itemOverrides: Partial<Omit<IWaterfallTransaction, 'doc' | 'docType'>> = {}
): IWaterfallTransaction => ({
  docType: 'transaction',
  doc: createMockTransactionDoc(docOverrides),
  id: 'tx-1',
  duration: 5000,
  offset: 0,
  skew: 0,
  legendValues: { serviceName: 'test-service', type: '' },
  color: '#000',
  spanLinksCount: { linkedChildren: 0, linkedParents: 0 },
  ...itemOverrides,
});

/**
 * Creates a mock IWaterfall object.
 * Note: Only `items` and `errorItems` are used by `convertToTraceItems`.
 * Other properties are required by the IWaterfall interface but not consumed by this function.
 */
const createMockWaterfall = (overrides: Partial<IWaterfall> = {}): IWaterfall => ({
  // Properties used by convertToTraceItems
  items: [],
  errorItems: [],
  // Properties required by IWaterfall interface but not used by convertToTraceItems
  duration: 0,
  legends: [],
  colorBy: WaterfallLegendType.ServiceName,
  exceedsMax: false,
  totalErrorsCount: 0,
  traceDocsTotal: 0,
  maxTraceItems: 5000,
  orphanTraceItemsCount: 0,
  childrenByParentId: {},
  getErrorCount: () => 0,
  ...overrides,
});

describe('convertToTraceItems', () => {
  describe('basic conversion', () => {
    it('should return empty array when waterfall has no items', () => {
      const waterfall = createMockWaterfall({ items: [] });
      const result = convertToTraceItems(waterfall);
      expect(result).toEqual([]);
    });

    it('should convert a single span item', () => {
      const spanItem = createMockSpanItem();
      const waterfall = createMockWaterfall({ items: [spanItem] });

      const result = convertToTraceItems(waterfall);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'span-1',
          name: 'GET /api',
          type: 'external',
          serviceName: 'test-service',
          agentName: 'nodejs',
          duration: 1000,
        })
      );
    });

    it('should convert a single transaction item', () => {
      const txItem = createMockTransactionItem();
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'tx-1',
          name: 'GET /api',
          type: 'request',
          serviceName: 'test-service',
          agentName: 'nodejs',
          duration: 5000,
        })
      );
    });

    it('should include all required TraceItem properties', () => {
      const spanItem = createMockSpanItem();
      const txItem = createMockTransactionItem();
      const waterfall = createMockWaterfall({ items: [spanItem, txItem] });

      const result = convertToTraceItems(waterfall);

      // Verify span item has all required properties
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        timestampUs: expect.any(Number),
        name: expect.any(String),
        traceId: expect.any(String),
        duration: expect.any(Number),
        errors: expect.any(Array),
        serviceName: expect.any(String),
        spanLinksCount: expect.objectContaining({
          incoming: expect.any(Number),
          outgoing: expect.any(Number),
        }),
      });

      // Verify transaction item has all required properties
      expect(result[1]).toMatchObject({
        id: expect.any(String),
        timestampUs: expect.any(Number),
        name: expect.any(String),
        traceId: expect.any(String),
        duration: expect.any(Number),
        errors: expect.any(Array),
        serviceName: expect.any(String),
        spanLinksCount: expect.objectContaining({
          incoming: expect.any(Number),
          outgoing: expect.any(Number),
        }),
      });
    });

    it('should convert multiple items preserving order', () => {
      const txItem = createMockTransactionItem({}, { id: 'tx-1' });
      const spanItem1 = createMockSpanItem(
        { span: { id: 'span-1', type: 'db', name: 'SELECT', duration: { us: 500 } } },
        { id: 'span-1' }
      );
      const spanItem2 = createMockSpanItem(
        { span: { id: 'span-2', type: 'external', name: 'HTTP GET', duration: { us: 800 } } },
        { id: 'span-2' }
      );

      const waterfall = createMockWaterfall({ items: [txItem, spanItem1, spanItem2] });
      const result = convertToTraceItems(waterfall);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('tx-1');
      expect(result[1].id).toBe('span-1');
      expect(result[2].id).toBe('span-2');
    });
  });

  describe('span conversion', () => {
    it('should return database icon for db type spans', () => {
      const spanItem = createMockSpanItem({
        span: { id: 'span-1', type: 'db', name: 'SELECT * FROM users', duration: { us: 500 } },
      });
      const waterfall = createMockWaterfall({ items: [spanItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].icon).toBe('database');
    });

    it('should return database icon for db.postgresql type spans', () => {
      const spanItem = createMockSpanItem({
        span: { id: 'span-1', type: 'db.postgresql', name: 'SELECT', duration: { us: 500 } },
      });
      const waterfall = createMockWaterfall({ items: [spanItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].icon).toBe('database');
    });

    it('should not return icon for non-db type spans', () => {
      const spanItem = createMockSpanItem({
        span: { id: 'span-1', type: 'external', name: 'HTTP GET', duration: { us: 500 } },
      });
      const waterfall = createMockWaterfall({ items: [spanItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].icon).toBeUndefined();
    });

    it('should use span.subtype as type when available', () => {
      const spanItem = createMockSpanItem({
        span: {
          id: 'span-1',
          type: 'db',
          subtype: 'postgresql',
          name: 'SELECT',
          duration: { us: 500 },
        },
      });
      const waterfall = createMockWaterfall({ items: [spanItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].type).toBe('postgresql');
    });

    it('should fallback to span.type when subtype is not available', () => {
      const spanItem = createMockSpanItem({
        span: { id: 'span-1', type: 'external', name: 'HTTP', duration: { us: 500 } },
      });
      const waterfall = createMockWaterfall({ items: [spanItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].type).toBe('external');
    });

    it('should fallback to span.type when subtype is empty string', () => {
      const spanItem = createMockSpanItem({
        span: { id: 'span-1', type: 'db', subtype: '', name: 'SELECT', duration: { us: 500 } },
      });
      const waterfall = createMockWaterfall({ items: [spanItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].type).toBe('db');
    });

    it('should handle span with undefined type', () => {
      const spanItem = createMockSpanItem({
        span: { id: 'span-1', name: 'Unknown span', duration: { us: 500 } } as any,
      });
      const waterfall = createMockWaterfall({ items: [spanItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].type).toBeUndefined();
    });

    it('should include sync property from span', () => {
      const syncSpan = createMockSpanItem({
        span: { id: 'span-1', type: 'external', name: 'HTTP', duration: { us: 500 }, sync: true },
      });
      const asyncSpan = createMockSpanItem(
        {
          span: {
            id: 'span-2',
            type: 'external',
            name: 'HTTP',
            duration: { us: 500 },
            sync: false,
          },
        },
        { id: 'span-2' }
      );
      const waterfall = createMockWaterfall({ items: [syncSpan, asyncSpan] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].sync).toBe(true);
      expect(result[1].sync).toBe(false);
    });
  });

  describe('transaction conversion', () => {
    it('should return globe icon for RUM agent (js-base)', () => {
      const txItem = createMockTransactionItem({ agent: { name: 'js-base' } });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].icon).toBe('globe');
    });

    it('should return globe icon for RUM agent (rum-js)', () => {
      const txItem = createMockTransactionItem({ agent: { name: 'rum-js' } });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].icon).toBe('globe');
    });

    it('should return merge icon for non-RUM agents', () => {
      const txItem = createMockTransactionItem({ agent: { name: 'nodejs' } });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].icon).toBe('merge');
    });

    it('should return merge icon when agent.name is undefined', () => {
      const txItem = createMockTransactionItem({ agent: { name: undefined } } as any);
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].icon).toBe('merge');
    });

    it('should map transaction.name and transaction.type correctly', () => {
      const txItem = createMockTransactionItem({
        transaction: {
          id: 'tx-1',
          name: 'POST /users',
          type: 'request',
          duration: { us: 3000 },
        },
      });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].name).toBe('POST /users');
      expect(result[0].type).toBe('request');
    });

    it('should set sync to undefined for transactions', () => {
      const txItem = createMockTransactionItem();
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].sync).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should associate errors with their parent items', () => {
      const txItem = createMockTransactionItem({}, { id: 'tx-1' });
      const errorItem: IWaterfallError = {
        docType: 'error',
        id: 'error-1',
        parentId: 'tx-1',
        doc: {
          error: { id: 'error-1', grouping_key: 'key-1' },
          service: { name: 'test-service' },
        } as IWaterfallError['doc'],
        offset: 100,
        skew: 0,
        color: '#f00',
      };

      const waterfall = createMockWaterfall({
        items: [txItem],
        errorItems: [errorItem],
      });

      const result = convertToTraceItems(waterfall);

      expect(result[0].errors).toHaveLength(1);
      expect(result[0].errors[0].errorDocId).toBe('error-1');
    });

    it('should associate multiple errors with the same parent', () => {
      const spanItem = createMockSpanItem({}, { id: 'span-1' });
      const errorItems: IWaterfallError[] = [
        {
          docType: 'error',
          id: 'error-1',
          parentId: 'span-1',
          doc: {
            error: { id: 'error-1', grouping_key: 'key-1' },
            service: { name: 'test-service' },
          } as IWaterfallError['doc'],
          offset: 100,
          skew: 0,
          color: '#f00',
        },
        {
          docType: 'error',
          id: 'error-2',
          parentId: 'span-1',
          doc: {
            error: { id: 'error-2', grouping_key: 'key-2' },
            service: { name: 'test-service' },
          } as IWaterfallError['doc'],
          offset: 200,
          skew: 0,
          color: '#f00',
        },
      ];

      const waterfall = createMockWaterfall({
        items: [spanItem],
        errorItems,
      });

      const result = convertToTraceItems(waterfall);

      expect(result[0].errors).toHaveLength(2);
      expect(result[0].errors[0].errorDocId).toBe('error-1');
      expect(result[0].errors[1].errorDocId).toBe('error-2');
    });

    it('should return empty errors array for items without errors', () => {
      const txItem = createMockTransactionItem({}, { id: 'tx-1' });
      const spanItem = createMockSpanItem({}, { id: 'span-1' });
      const errorItem: IWaterfallError = {
        docType: 'error',
        id: 'error-1',
        parentId: 'tx-1',
        doc: {
          error: { id: 'error-1', grouping_key: 'key-1' },
          service: { name: 'test-service' },
        } as IWaterfallError['doc'],
        offset: 100,
        skew: 0,
        color: '#f00',
      };

      const waterfall = createMockWaterfall({
        items: [txItem, spanItem],
        errorItems: [errorItem],
      });

      const result = convertToTraceItems(waterfall);

      expect(result[0].errors).toHaveLength(1);
      expect(result[1].errors).toHaveLength(0);
    });

    it('should handle errors without parentId', () => {
      const txItem = createMockTransactionItem({}, { id: 'tx-1' });
      const errorItem: IWaterfallError = {
        docType: 'error',
        id: 'error-1',
        parentId: undefined,
        doc: {
          error: { id: 'error-1', grouping_key: 'key-1' },
          service: { name: 'test-service' },
        } as IWaterfallError['doc'],
        offset: 100,
        skew: 0,
        color: '#f00',
      };

      const waterfall = createMockWaterfall({
        items: [txItem],
        errorItems: [errorItem],
      });

      const result = convertToTraceItems(waterfall);

      expect(result[0].errors).toHaveLength(0);
    });
  });

  describe('status extraction', () => {
    it('should extract event.outcome when present', () => {
      const txItem = createMockTransactionItem({ event: { outcome: 'success' } });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].status).toEqual({
        fieldName: EVENT_OUTCOME,
        value: 'success',
      });
    });

    it('should return undefined status when event.outcome is not present', () => {
      const txItem = createMockTransactionItem({ event: undefined });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].status).toBeUndefined();
    });

    it('should return undefined status when event exists but outcome is missing', () => {
      const txItem = createMockTransactionItem({ event: {} });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].status).toBeUndefined();
    });
  });

  describe('span links mapping', () => {
    it('should map linkedParents to incoming and linkedChildren to outgoing', () => {
      const txItem = createMockTransactionItem(
        {},
        { spanLinksCount: { linkedChildren: 2, linkedParents: 4 } }
      );
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].spanLinksCount).toEqual({
        incoming: 4,
        outgoing: 2,
      });
    });
  });

  describe('common properties', () => {
    it('should include traceId from document', () => {
      const txItem = createMockTransactionItem({ trace: { id: 'my-trace-id' } });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].traceId).toBe('my-trace-id');
    });

    it('should include timestampUs from document', () => {
      const txItem = createMockTransactionItem({ timestamp: { us: 1234567890 } });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].timestampUs).toBe(1234567890);
    });

    it('should include parentId when present', () => {
      const spanItem = createMockSpanItem({}, { parentId: 'parent-tx-1' });
      const waterfall = createMockWaterfall({ items: [spanItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].parentId).toBe('parent-tx-1');
    });

    it('should have undefined parentId for root items', () => {
      const txItem = createMockTransactionItem({}, { parentId: undefined });
      const waterfall = createMockWaterfall({ items: [txItem] });

      const result = convertToTraceItems(waterfall);

      expect(result[0].parentId).toBeUndefined();
    });
  });
});

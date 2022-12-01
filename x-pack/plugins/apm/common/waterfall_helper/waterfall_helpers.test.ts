/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import { Transaction } from '../../typings/es_schemas/ui/transaction';
import { getClockSkew, getOrderedWaterfallItems, getWaterfall } from '.';
import type {
  WaterfallErrorDoc,
  IWaterfallTransaction,
  IWaterfallError,
  IWaterfallSpanOrTransaction,
  IWaterfallSpan,
  WaterfallSpanDoc,
  WaterfallTransactionDoc,
} from './typings';
import { ProcessorEvent } from '@kbn/observability-plugin/common';

describe('waterfall_helpers', () => {
  describe('getWaterfall', () => {
    const hits: Array<WaterfallTransactionDoc | WaterfallSpanDoc> = [
      {
        processor: { event: ProcessorEvent.transaction },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-node' },
        timestamp: { us: 1549324795784006 },
        agent: {
          name: 'nodejs',
          version: '1.0.0',
        },
        transaction: {
          duration: { us: 49660 },
          name: 'GET /api',
          id: 'myTransactionId1',
          type: 'request',
        },
      },
      {
        parent: { id: 'mySpanIdA' },
        processor: { event: ProcessorEvent.span },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-ruby' },
        timestamp: { us: 1549324795825633 },
        agent: {
          name: 'ruby',
          version: '1.0.0',
        },
        span: {
          duration: { us: 481 },
          name: 'SELECT FROM products',
          id: 'mySpanIdB',
          type: 'db',
        },
      },
      {
        parent: { id: 'myTransactionId2' },
        processor: { event: ProcessorEvent.span },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-ruby' },
        agent: {
          name: 'ruby',
          version: '1.0.0',
        },
        span: {
          duration: { us: 6161 },
          name: 'Api::ProductsController#index',
          id: 'mySpanIdA',
          type: 'external',
        },
        timestamp: { us: 1549324795824504 },
      },
      {
        parent: { id: 'mySpanIdA' },
        processor: { event: ProcessorEvent.span },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-ruby' },
        agent: {
          name: 'ruby',
          version: '1.0.0',
        },
        span: {
          duration: { us: 532 },
          name: 'SELECT FROM product',
          id: 'mySpanIdC',
          type: 'db',
        },
        timestamp: { us: 1549324795827905 },
      },
      {
        parent: { id: 'myTransactionId1' },
        processor: { event: ProcessorEvent.span },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-node' },
        agent: {
          name: 'nodejs',
          version: '1.0.0',
        },
        span: {
          duration: { us: 47557 },
          name: 'GET opbeans-ruby:3000/api/products',
          id: 'mySpanIdD',
          type: 'external',
        },
        timestamp: { us: 1549324795785760 },
      },
      {
        parent: { id: 'mySpanIdD' },
        processor: { event: ProcessorEvent.transaction },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-ruby' },
        agent: {
          name: 'ruby',
          version: '1.0.0',
        },
        transaction: {
          duration: { us: 8634 },
          name: 'Api::ProductsController#index',
          id: 'myTransactionId2',
          type: 'request',
        },
        timestamp: { us: 1549324795823304 },
      },
    ];
    const errorDocs = [
      {
        parent: { id: 'myTransactionId1' },
        timestamp: { us: 1549324795810000 },
        trace: { id: 'myTraceId' },
        transaction: { id: 'myTransactionId1' },
        error: {
          id: 'error1',
          grouping_key: 'errorGroupingKey1',
          log: {
            message: 'error message',
          },
        },
        service: { name: 'opbeans-ruby' },
      } as WaterfallErrorDoc,
    ];

    it('should return full waterfall', () => {
      const entryTransaction = {
        processor: { event: ProcessorEvent.transaction },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-node' },
        timestamp: { us: 1549324795784006 },
        agent: {
          name: 'nodejs',
          version: '1.0.0',
        },
        transaction: {
          duration: { us: 49660 },
          name: 'GET /api',
          id: 'myTransactionId1',
          type: 'request',
          marks: {
            agent: {
              domInteractive: 382,
              domComplete: 383,
              timeToFirstByte: 14,
            },
          },
        },
      } as unknown as Transaction;
      const apiResp = {
        traceDocs: hits,
        errorDocs,
        exceedsMax: false,
        linkedChildrenOfSpanCountBySpanId: {},
      };
      const waterfall = getWaterfall(apiResp, entryTransaction);

      expect(waterfall.exceedsMax).toBeFalsy();
      expect(waterfall.items.length).toBe(6);
      expect(waterfall.items[0].id).toBe('myTransactionId1');
      expect(waterfall.errorItems.length).toBe(1);
      expect(waterfall.errorCountById.myTransactionId1).toEqual(1);
      expect(waterfall).toMatchSnapshot();
    });

    it('should return partial waterfall', () => {
      const entryTransaction = {
        parent: { id: 'mySpanIdD' },
        processor: { event: ProcessorEvent.transaction },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-ruby' },
        agent: {
          name: 'ruby',
          version: '1.0.0',
        },
        transaction: {
          duration: { us: 8634 },
          name: 'Api::ProductsController#index',
          id: 'myTransactionId2',
          type: 'request',
        },
        timestamp: { us: 1549324795823304 },
      } as unknown as Transaction;

      const apiResp = {
        traceDocs: hits,
        errorDocs,
        exceedsMax: false,
        linkedChildrenOfSpanCountBySpanId: {},
      };
      const waterfall = getWaterfall(apiResp, entryTransaction);

      expect(waterfall.exceedsMax).toBeFalsy();
      expect(waterfall.items.length).toBe(4);
      expect(waterfall.items[0].id).toBe('myTransactionId2');
      expect(waterfall.errorItems.length).toBe(0);
      expect(waterfall.errorCountById.myTransactionId2).toBeUndefined();
      expect(waterfall).toMatchSnapshot();
    });
    it('should reparent spans', () => {
      const traceItems: Array<WaterfallTransactionDoc | WaterfallSpanDoc> = [
        {
          processor: { event: ProcessorEvent.transaction },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-node' },
          agent: {
            name: 'nodejs',
            version: '1.0.0',
          },
          transaction: {
            duration: { us: 49660 },
            name: 'GET /api',
            id: 'myTransactionId1',
            type: 'request',
          },
          timestamp: { us: 1549324795784006 },
        },
        {
          parent: { id: 'mySpanIdD' },
          processor: { event: ProcessorEvent.span },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-ruby' },
          timestamp: { us: 1549324795825633 },
          agent: {
            name: 'ruby',
            version: '1.0.0',
          },
          span: {
            duration: { us: 481 },
            name: 'SELECT FROM products',
            id: 'mySpanIdB',
            type: 'db',
          },
          child: { id: ['mySpanIdA', 'mySpanIdC'] },
        },
        {
          parent: { id: 'mySpanIdD' },
          processor: { event: ProcessorEvent.span },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-ruby' },
          agent: {
            name: 'ruby',
            version: '1.0.0',
          },
          span: {
            duration: { us: 6161 },
            name: 'Api::ProductsController#index',
            id: 'mySpanIdA',
            type: 'externa;',
          },
          timestamp: { us: 1549324795824504 },
        },
        {
          parent: { id: 'mySpanIdD' },
          processor: { event: ProcessorEvent.span },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-ruby' },
          agent: {
            name: 'ruby',
            version: '1.0.0',
          },
          span: {
            duration: { us: 532 },
            name: 'SELECT FROM product',
            id: 'mySpanIdC',
            type: 'db',
          },
          timestamp: { us: 1549324795827905 },
        },
        {
          parent: { id: 'myTransactionId1' },
          processor: { event: ProcessorEvent.span },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-node' },
          agent: {
            name: 'nodejs',
            version: '1.0.0',
          },
          span: {
            duration: { us: 47557 },
            name: 'GET opbeans-ruby:3000/api/products',
            id: 'mySpanIdD',
            type: 'external',
          },
          timestamp: { us: 1549324795785760 },
        },
      ];
      const entryTransaction = {
        processor: { event: ProcessorEvent.transaction },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-node' },
        agent: {
          name: 'nodejs',
          version: '1.0.0',
        },
        transaction: {
          duration: { us: 49660 },
          name: 'GET /api',
          id: 'myTransactionId1',
          type: 'request',
        },
        timestamp: { us: 1549324795784006 },
      } as unknown as Transaction;
      const waterfall = getWaterfall(
        {
          traceDocs: traceItems,
          errorDocs: [],
          exceedsMax: false,
          linkedChildrenOfSpanCountBySpanId: {},
        },
        entryTransaction
      );
      const getIdAndParentId = (item: IWaterfallSpanOrTransaction) => ({
        id: item.id,
        parentId: item.parent?.id,
      });

      expect(waterfall.items.length).toBe(5);
      expect(getIdAndParentId(waterfall.items[0])).toEqual({
        id: 'myTransactionId1',
        parentId: undefined,
      });
      expect(getIdAndParentId(waterfall.items[1])).toEqual({
        id: 'mySpanIdD',
        parentId: 'myTransactionId1',
      });
      expect(getIdAndParentId(waterfall.items[2])).toEqual({
        id: 'mySpanIdB',
        parentId: 'mySpanIdD',
      });
      expect(getIdAndParentId(waterfall.items[3])).toEqual({
        id: 'mySpanIdA',
        parentId: 'mySpanIdB',
      });
      expect(getIdAndParentId(waterfall.items[4])).toEqual({
        id: 'mySpanIdC',
        parentId: 'mySpanIdB',
      });
      expect(waterfall.errorItems.length).toBe(0);
      expect(waterfall.errorCountById.myTransactionId1).toBeUndefined();
    });

    it("shouldn't reparent spans when child id isn't found", () => {
      const traceItems: Array<WaterfallTransactionDoc | WaterfallSpanDoc> = [
        {
          processor: { event: ProcessorEvent.transaction },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-node' },
          agent: {
            name: 'nodejs',
            version: '1.0.0',
          },
          transaction: {
            duration: { us: 49660 },
            name: 'GET /api',
            id: 'myTransactionId1',
            type: 'request',
          },
          timestamp: { us: 1549324795784006 },
        },
        {
          parent: { id: 'mySpanIdD' },
          processor: { event: ProcessorEvent.span },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-ruby' },
          agent: {
            name: 'ruby',
            version: '1.0.0',
          },
          timestamp: { us: 1549324795825633 },
          span: {
            duration: { us: 481 },
            name: 'SELECT FROM products',
            id: 'mySpanIdB',
            type: 'db',
          },
          child: { id: ['incorrectId', 'mySpanIdC'] },
        },
        {
          parent: { id: 'mySpanIdD' },
          processor: { event: ProcessorEvent.span },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-ruby' },
          agent: {
            name: 'ruby',
            version: '1.0.0',
          },
          span: {
            duration: { us: 6161 },
            name: 'Api::ProductsController#index',
            id: 'mySpanIdA',
            type: 'external',
          },
          timestamp: { us: 1549324795824504 },
        },
        {
          parent: { id: 'mySpanIdD' },
          processor: { event: ProcessorEvent.span },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-ruby' },
          agent: {
            name: 'ruby',
            version: '1.0.0',
          },
          span: {
            duration: { us: 532 },
            name: 'SELECT FROM product',
            id: 'mySpanIdC',
            type: 'db',
          },
          timestamp: { us: 1549324795827905 },
        },
        {
          parent: { id: 'myTransactionId1' },
          processor: { event: ProcessorEvent.span },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-node' },
          agent: {
            name: 'nodejs',
            version: '1.0.0',
          },
          span: {
            duration: { us: 47557 },
            name: 'GET opbeans-ruby:3000/api/products',
            id: 'mySpanIdD',
            type: 'external',
          },
          timestamp: { us: 1549324795785760 },
        },
      ];
      const entryTransaction = {
        processor: { event: ProcessorEvent.transaction },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-node' },
        agent: {
          name: 'nodejs',
          version: '1.0.0',
        },
        transaction: {
          duration: { us: 49660 },
          name: 'GET /api',
          id: 'myTransactionId1',
          type: 'request',
        },
        timestamp: { us: 1549324795784006 },
      } as unknown as Transaction;
      const waterfall = getWaterfall(
        {
          traceDocs: traceItems,
          errorDocs: [],
          exceedsMax: false,
          linkedChildrenOfSpanCountBySpanId: {},
        },
        entryTransaction
      );
      const getIdAndParentId = (item: IWaterfallSpanOrTransaction) => ({
        id: item.id,
        parentId: item.parent?.id,
      });
      expect(waterfall.items.length).toBe(5);
      expect(getIdAndParentId(waterfall.items[0])).toEqual({
        id: 'myTransactionId1',
        parentId: undefined,
      });
      expect(getIdAndParentId(waterfall.items[1])).toEqual({
        id: 'mySpanIdD',
        parentId: 'myTransactionId1',
      });
      expect(getIdAndParentId(waterfall.items[2])).toEqual({
        id: 'mySpanIdA',
        parentId: 'mySpanIdD',
      });
      expect(getIdAndParentId(waterfall.items[3])).toEqual({
        id: 'mySpanIdB',
        parentId: 'mySpanIdD',
      });
      expect(getIdAndParentId(waterfall.items[4])).toEqual({
        id: 'mySpanIdC',
        parentId: 'mySpanIdB',
      });
      expect(waterfall.errorItems.length).toBe(0);
      expect(waterfall.errorCountById.myTransactionId1).toBeUndefined();
    });
  });

  describe('getWaterfallItems', () => {
    it('should order items correctly', () => {
      const legendValues = {
        serviceName: 'opbeans-java',
        spanType: '',
      };

      const items: IWaterfallSpanOrTransaction[] = [
        {
          docType: ProcessorEvent.span,
          doc: {
            trace: { id: '1' },
            processor: { event: ProcessorEvent.span },
            parent: { id: 'c' },
            service: { name: 'opbeans-java' },
            timestamp: { us: 1536763736371000 },
            agent: {
              name: 'java',
              version: '1.0.0',
            },
            span: {
              id: 'd',
              name: 'SELECT',
              type: 'db',
              duration: { us: 47557 },
            },
          },
          id: 'd',
          parentId: 'c',
          duration: 210,
          offset: 0,
          skew: 0,
          legendValues,
          color: '',
          spanLinksCount: {
            linkedChildren: 0,
            linkedParents: 0,
          },
        },
        {
          docType: ProcessorEvent.span,
          doc: {
            trace: { id: '1' },
            processor: { event: ProcessorEvent.span },
            parent: { id: 'a' },
            service: { name: 'opbeans-java' },
            agent: {
              name: 'java',
              version: '1.0.0',
            },
            timestamp: { us: 1536763736368000 },
            span: {
              id: 'b',
              name: 'GET [0:0:0:0:0:0:0:1]',
              type: 'external',
              duration: { us: 47557 },
            },
          },
          id: 'b',
          parentId: 'a',
          duration: 4694,
          offset: 0,
          skew: 0,
          legendValues,
          color: '',
          spanLinksCount: {
            linkedChildren: 0,
            linkedParents: 0,
          },
        },
        {
          docType: ProcessorEvent.span,
          doc: {
            trace: { id: '1' },
            processor: { event: ProcessorEvent.span },
            parent: { id: 'a' },
            service: { name: 'opbeans-java' },
            timestamp: { us: 1536763736367000 },
            agent: {
              name: 'java',
              version: '1.0.0',
            },
            span: {
              id: 'b2',
              name: 'GET [0:0:0:0:0:0:0:1]',
              type: 'external',
              duration: { us: 47557 },
            },
          },
          id: 'b2',
          parentId: 'a',
          duration: 4694,
          offset: 0,
          skew: 0,
          legendValues,
          color: '',
          spanLinksCount: {
            linkedChildren: 0,
            linkedParents: 0,
          },
        },
        {
          docType: ProcessorEvent.transaction,
          doc: {
            trace: { id: '1' },
            processor: { event: ProcessorEvent.transaction },
            parent: { id: 'b' },
            service: { name: 'opbeans-java' },
            timestamp: { us: 1536763736369000 },
            agent: {
              name: 'java',
              version: '1.0.0',
            },
            transaction: {
              id: 'c',
              name: 'APIRestController#productsRemote',
              type: 'request',
              duration: { us: 47557 },
            },
          },
          id: 'c',
          parentId: 'b',
          duration: 3581,
          offset: 0,
          skew: 0,
          legendValues,
          color: '',
          spanLinksCount: {
            linkedChildren: 0,
            linkedParents: 0,
          },
        },
        {
          docType: ProcessorEvent.transaction,
          doc: {
            trace: { id: '1' },
            processor: { event: ProcessorEvent.transaction },
            service: { name: 'opbeans-java' },
            agent: {
              name: 'java',
              version: '1.0.0',
            },
            timestamp: { us: 1536763736366000 },
            transaction: {
              id: 'a',
              name: 'APIRestController#products',
              type: 'request',
              duration: { us: 47557 },
            },
          },
          id: 'a',
          duration: 9480,
          offset: 0,
          skew: 0,
          legendValues,
          color: '',
          spanLinksCount: {
            linkedChildren: 0,
            linkedParents: 0,
          },
        },
      ];

      const childrenByParentId = groupBy(items, (hit) =>
        hit.parentId ? hit.parentId : 'root'
      );
      const entryTransactionItem = childrenByParentId
        .root[0] as IWaterfallTransaction;

      expect(
        getOrderedWaterfallItems(childrenByParentId, entryTransactionItem)
      ).toMatchSnapshot();
    });

    it('should handle cyclic references', () => {
      const items: IWaterfallSpanOrTransaction[] = [
        {
          docType: ProcessorEvent.transaction,
          id: 'a',
          doc: {
            transaction: { id: 'a' },
            timestamp: { us: 10 },
          },
        } as unknown as IWaterfallTransaction,
        {
          docType: ProcessorEvent.span,
          id: 'b',
          parentId: 'a',
          doc: {
            span: {
              id: 'b',
            },
            parent: { id: 'a' },
            timestamp: { us: 20 },
          },
        } as unknown as IWaterfallSpan,
      ];
      const childrenByParentId = groupBy(items, (hit) =>
        hit.parentId ? hit.parentId : 'root'
      );
      const entryTransactionItem = childrenByParentId
        .root[0] as IWaterfallTransaction;
      expect(
        getOrderedWaterfallItems(childrenByParentId, entryTransactionItem)
      ).toMatchSnapshot();
    });
  });

  describe('getClockSkew', () => {
    it('should adjust when child starts before parent', () => {
      const child = {
        docType: ProcessorEvent.transaction,
        doc: {
          timestamp: { us: 0 },
        },
        duration: 50,
      } as IWaterfallSpanOrTransaction;

      const parent = {
        docType: ProcessorEvent.transaction,
        doc: {
          timestamp: { us: 100 },
        },
        duration: 100,
        skew: 5,
      } as IWaterfallSpanOrTransaction;

      expect(getClockSkew(child, parent)).toBe(130);
    });

    it('should not adjust when child starts after parent has ended', () => {
      const child = {
        docType: ProcessorEvent.transaction,
        doc: {
          timestamp: { us: 250 },
        },
        duration: 50,
      } as IWaterfallSpanOrTransaction;

      const parent = {
        docType: ProcessorEvent.transaction,
        doc: {
          timestamp: { us: 100 },
        },
        duration: 100,
        skew: 5,
      } as IWaterfallSpanOrTransaction;

      expect(getClockSkew(child, parent)).toBe(0);
    });

    it('should not adjust when child starts within parent duration', () => {
      const child = {
        docType: ProcessorEvent.transaction,
        doc: {
          timestamp: { us: 150 },
        },
        duration: 50,
      } as IWaterfallSpanOrTransaction;

      const parent = {
        docType: ProcessorEvent.transaction,
        doc: {
          timestamp: { us: 100 },
        },
        duration: 100,
        skew: 5,
      } as IWaterfallSpanOrTransaction;

      expect(getClockSkew(child, parent)).toBe(0);
    });

    it('should return parent skew for spans', () => {
      const child = {
        docType: ProcessorEvent.span,
      } as IWaterfallSpanOrTransaction;

      const parent = {
        docType: ProcessorEvent.span,
        doc: {
          timestamp: { us: 100 },
        },
        duration: 100,
        skew: 5,
      } as IWaterfallSpanOrTransaction;

      expect(getClockSkew(child, parent)).toBe(5);
    });

    it('should return parent skew for errors', () => {
      const child = {
        docType: 'error',
      } as IWaterfallError;

      const parent = {
        docType: ProcessorEvent.transaction,
        doc: {
          timestamp: { us: 100 },
        },
        duration: 100,
        skew: 5,
      } as IWaterfallSpanOrTransaction;

      expect(getClockSkew(child, parent)).toBe(5);
    });

    it('should handle missing parent', () => {
      const child = {
        docType: ProcessorEvent.transaction,
      } as IWaterfallSpanOrTransaction;

      const parent = undefined;

      expect(getClockSkew(child, parent)).toBe(0);
    });
  });
});

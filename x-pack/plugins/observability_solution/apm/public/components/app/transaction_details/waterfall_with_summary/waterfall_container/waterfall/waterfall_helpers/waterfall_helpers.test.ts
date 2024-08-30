/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import {
  getClockSkew,
  getOrderedWaterfallItems,
  getWaterfall,
  IWaterfallItem,
  IWaterfallTransaction,
  IWaterfallError,
  IWaterfallSpanOrTransaction,
  getOrphanTraceItemsCount,
  buildTraceTree,
  convertTreeToList,
  updateTraceTreeNode,
  IWaterfallNode,
  IWaterfallNodeFlatten,
} from './waterfall_helpers';
import {
  WaterfallError,
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../../../../../../common/waterfall/typings';

describe('waterfall_helpers', () => {
  const hits = [
    {
      'processor.event': ['transaction'],
      'trace.id': ['myTraceId'],
      'service.name': ['opbeans-node'],
      'transaction.duration.us': [49660],
      'transaction.name': ['GET /api'],
      'transaction.id': ['myTransactionId1'],
      'timestamp.us': [1549324795784006],
    } as unknown as WaterfallTransaction,
    {
      'parent.id': ['mySpanIdA'],
      'processor.event': ['span'],
      'trace.id': ['myTraceId'],
      'service.name': ['opbeans-ruby'],
      'transaction.id': ['myTransactionId2'],
      'timestamp.us': [1549324795825633],
      'span.duration.us': [481],
      'span.name': ['SELECT FROM products'],
      'span.id': ['mySpanIdB'],
    } as unknown as WaterfallSpan,
    {
      'parent.id': ['myTransactionId2'],
      'processor.event': ['span'],
      'trace.id': ['myTraceId'],
      'service.name': ['opbeans-ruby'],
      'transaction.id': ['myTransactionId2'],
      'span.duration.us': [6161],
      'span.name': ['Api::ProductsController#index'],
      'span.id': ['mySpanIdA'],
      'timestamp.us': [1549324795824504],
    } as unknown as WaterfallSpan,
    {
      'parent.id': ['mySpanIdA'],
      'processor.event': ['span'],
      'trace.id': ['myTraceId'],
      'service.name': ['opbeans-ruby'],
      'transaction.id': ['myTransactionId2'],
      'span.duration.us': [532],
      'span.name': ['SELECT FROM product'],
      'span.id': ['mySpanIdC'],
      'timestamp.us': [1549324795827905],
    } as unknown as WaterfallSpan,
    {
      'parent.id': ['myTransactionId1'],
      'processor.event': ['span'],
      'trace.id': ['myTraceId'],
      'service.name': ['opbeans-node'],
      'transaction.id': ['myTransactionId1'],
      'span.duration.us': [47557],
      'span.name': ['GET opbeans-ruby:3000/api/products'],
      'span.id': ['mySpanIdD'],
      'timestamp.us': [1549324795785760],
    } as unknown as WaterfallSpan,
    {
      'parent.id': ['mySpanIdD'],
      'processor.event': ['transaction'],
      'trace.id': ['myTraceId'],
      'service.name': ['opbeans-ruby'],
      'transaction.duration.us': [8634],
      'transaction.name': ['Api::ProductsController#index'],
      'transaction.id': ['myTransactionId2'],
      'transaction.marks.agent.domInteractive': [382],
      'transaction.marks.agent.domComplete': [383],
      'transaction.marks.agent.timeToFirstByte': [14],
      'timestamp.us': [1549324795823304],
    } as unknown as WaterfallTransaction,
  ];
  const errorDocs = [
    {
      'processor.event': ['error'],
      'parent.id': ['myTransactionId1'],
      'timestamp.us': [1549324795810000],
      'trace.id': ['myTraceId'],
      'transaction.id': ['myTransactionId1'],
      'error.id': ['error1'],
      'error.grouping_key': ['errorGroupingKey1'],
      'error.log.message': ['error message'],
      'service.name': ['opbeans-ruby'],
      'agent.name': ['ruby'],
      'agent.version': ['2'],
    } as unknown as WaterfallError,
  ];

  describe('getWaterfall', () => {
    it('should return full waterfall', () => {
      const apiResp = {
        traceItems: {
          traceDocs: hits,
          errorDocs,
          exceedsMax: false,
          spanLinksCountById: {},
          traceDocsTotal: hits.length,
          maxTraceItems: 5000,
        },
        entryTransaction: {
          processor: { event: 'transaction' },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-node' },
          transaction: {
            duration: { us: 49660 },
            name: 'GET /api',
            id: 'myTransactionId1',
          },
          timestamp: { us: 1549324795784006 },
        } as Transaction,
      };
      const waterfall = getWaterfall(apiResp);

      expect(waterfall.items.length).toBe(6);
      expect(waterfall.items[0].id).toBe('myTransactionId1');
      expect(waterfall.errorItems.length).toBe(1);
      expect(waterfall.getErrorCount('myTransactionId1')).toEqual(1);
    });

    it('should return partial waterfall', () => {
      const apiResp = {
        traceItems: {
          traceDocs: hits,
          errorDocs,
          exceedsMax: false,
          spanLinksCountById: {},
          traceDocsTotal: hits.length,
          maxTraceItems: 5000,
        },
        entryTransaction: {
          parent: { id: 'mySpanIdD' },
          processor: { event: 'transaction' },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-ruby' },
          transaction: {
            duration: { us: 8634 },
            name: 'Api::ProductsController#index',
            id: 'myTransactionId2',
            marks: {
              agent: {
                domInteractive: 382,
                domComplete: 383,
                timeToFirstByte: 14,
              },
            },
          },
          timestamp: { us: 1549324795823304 },
        } as unknown as Transaction,
      };
      const waterfall = getWaterfall(apiResp);

      expect(waterfall.items.length).toBe(4);
      expect(waterfall.items[0].id).toBe('myTransactionId2');
      expect(waterfall.errorItems.length).toBe(0);
      expect(waterfall.getErrorCount('myTransactionId2')).toEqual(0);
    });
    it('should reparent spans', () => {
      const traceItems = [
        {
          'processor.event': ['transaction'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-node'],
          'transaction.duration.us': [49660],
          'transaction.name': ['GET /api'],
          'transaction.id': ['myTransactionId1'],
          'timestamp.us': [1549324795784006],
        } as WaterfallTransaction,
        {
          'parent.id': ['mySpanIdD'],
          'processor.event': ['span'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-ruby'],
          'transaction.id': ['myTransactionId1'],
          'timestamp.us': [1549324795825633],
          'span.duration.us': [481],
          'span.name': ['SELECT FROM products'],
          'span.id': ['mySpanIdB'],
          'child.id': ['mySpanIdA', 'mySpanIdC'],
        } as unknown as WaterfallSpan,
        {
          'parent.id': ['mySpanIdD'],
          'processor.event': ['span'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-ruby'],
          'transaction.id': ['myTransactionId1'],
          'span.duration.us': [6161],
          'span.name': ['Api::ProductsController#index'],
          'span.id': ['mySpanIdA'],
          'timestamp.us': [1549324795824504],
        } as WaterfallSpan,
        {
          'parent.id': ['mySpanIdD'],
          'processor.event': ['span'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-ruby'],
          'transaction.id': ['myTransactionId1'],
          'span.duration.us': [532],
          'span.name': ['SELECT FROM product'],
          'span.id': ['mySpanIdC'],
          'timestamp.us': [1549324795827905],
        } as WaterfallSpan,
        {
          'parent.id': ['myTransactionId1'],
          'processor.event': ['span'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-node'],
          'transaction.id': ['myTransactionId1'],
          'span.duration.us': [47557],
          'span.name': ['GET opbeans-ruby:3000/api/products'],
          'span.id': ['mySpanIdD'],
          'timestamp.us': [1549324795785760],
        } as WaterfallSpan,
      ];
      const waterfall = getWaterfall({
        traceItems: {
          traceDocs: traceItems,
          errorDocs: [],
          exceedsMax: false,
          spanLinksCountById: {},
          traceDocsTotal: traceItems.length,
          maxTraceItems: 5000,
        },
        entryTransaction: {
          processor: { event: 'transaction' },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-node' },
          transaction: {
            duration: { us: 49660 },
            name: 'GET /api',
            id: 'myTransactionId1',
          },
          timestamp: { us: 1549324795784006 },
        } as Transaction,
      });
      const getIdAndParentId = (item: IWaterfallItem) => ({
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
      expect(waterfall.getErrorCount('myTransactionId1')).toEqual(0);
    });

    it("shouldn't reparent spans when child id isn't found", () => {
      const traceItems = [
        {
          'processor.event': ['transaction'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-node'],
          'transaction.duration.us': [49660],
          'transaction.name': ['GET /api'],
          'transaction.id': ['myTransactionId1'],
          'timestamp.us': [1549324795784006],
        } as unknown as WaterfallTransaction,
        {
          'parent.id': ['mySpanIdD'],
          'processor.event': ['span'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-ruby'],
          'transaction.id': ['myTransactionId1'],
          'timestamp.us': [1549324795825633],
          'span.duration.us': [481],
          'span.name': ['SELECT FROM products'],
          'span.id': ['mySpanIdB'],
          'child.id': ['incorrectId', 'mySpanIdC'],
        } as unknown as WaterfallSpan,
        {
          'parent.id': ['mySpanIdD'],
          'processor.event': ['span'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-ruby'],
          'transaction.id': ['myTransactionId1'],
          'span.duration.us': [6161],
          'span.name': ['Api::ProductsController#index'],
          'span.id': ['mySpanIdA'],
          'timestamp.us': [1549324795824504],
        } as unknown as WaterfallSpan,
        {
          'parent.id': ['mySpanIdD'],
          'processor.event': ['span'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-ruby'],
          'transaction.id': ['myTransactionId1'],
          'span.duration.us': [532],
          'span.name': ['SELECT FROM product'],
          'span.id': ['mySpanIdC'],
          'timestamp.us': [1549324795827905],
        } as unknown as WaterfallSpan,
        {
          'parent.id': ['myTransactionId1'],
          'processor.event': ['span'],
          ' trace.id': ['myTraceId'],
          'service.name': ['opbeans-node'],
          'transaction.id': ['myTransactionId1'],
          'span.duration.us': [47557],
          'span.name': ['GET opbeans-ruby:3000/api/products'],
          'span.id': ['mySpanIdD'],
          'timestamp.us': [1549324795785760],
        } as unknown as WaterfallSpan,
      ];

      const waterfall = getWaterfall({
        traceItems: {
          traceDocs: traceItems,
          errorDocs: [],
          exceedsMax: false,
          spanLinksCountById: {},
          traceDocsTotal: traceItems.length,
          maxTraceItems: 5000,
        },
        entryTransaction: {
          processor: { event: 'transaction' },
          trace: { id: 'myTraceId' },
          service: { name: 'opbeans-node' },
          transaction: {
            duration: { us: 49660 },
            name: 'GET /api',
            id: 'myTransactionId1',
          },
          timestamp: { us: 1549324795784006 },
        } as Transaction,
      });
      const getIdAndParentId = (item: IWaterfallItem) => ({
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
      expect(waterfall.getErrorCount('myTransactionId1')).toEqual(0);
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
          docType: 'span',
          doc: {
            'parent.id': ['c'],
            'service.name': ['opbeans-java'],
            'transaction.id': ['c'],
            'timestamp.us': [1536763736371000],
            'span.id': ['d'],
            'span.name': ['SELECT'],
          } as WaterfallSpan,
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
          docType: 'span',
          doc: {
            'parent.id': ['a'],
            'service.name': ['opbeans-java'],
            'transaction.id': ['a'],
            'timestamp.us': [1536763736368000],
            'span.id': ['b'],
            'span.name': ['GET [0:0:0:0:0:0:0:1]'],
          } as WaterfallSpan,
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
          docType: 'span',
          doc: {
            'parent.id': ['a'],
            'service.name': ['opbeans-java'],
            'transaction.id': ['a'],
            'timestamp.us': [1536763736367000],
            'span.id': ['b2'],
            'span.name': ['GET [0:0:0:0:0:0:0:1]'],
          } as WaterfallSpan,
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
          docType: 'transaction',
          doc: {
            'parent.id': ['b'],
            'service.name': ['opbeans-java'],
            'timestamp.us': [1536763736369000],
            'transaction.id': ['c'],
            'transaction.name': ['APIRestController#productsRemote'],
          } as WaterfallTransaction,
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
          docType: 'transaction',
          doc: {
            'service.name': ['opbeans-java'],
            'timestamp.us': [1536763736366000],
            'transaction.id': ['a'],
            'transaction.name': ['APIRestController#products'],
          } as WaterfallTransaction,
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

      const childrenByParentId = groupBy(items, (hit) => (hit.parentId ? hit.parentId : 'root'));
      const entryTransactionItem = childrenByParentId.root[0] as IWaterfallTransaction;

      expect(getOrderedWaterfallItems(childrenByParentId, entryTransactionItem)).toMatchSnapshot();
    });

    it('should handle cyclic references', () => {
      const items = [
        {
          docType: 'transaction',
          id: 'a',
          doc: {
            'transaction.id': ['a'],
            'timestamp.us': [10],
          } as unknown as WaterfallTransaction,
        } as IWaterfallSpanOrTransaction,
        {
          docType: 'span',
          id: 'b',
          parentId: 'a',
          doc: {
            'span.id': ['b'],
            'parent.id': ['a'],
            'timestamp.us': [20],
          } as unknown as WaterfallSpan,
        } as IWaterfallSpanOrTransaction,
      ];
      const childrenByParentId = groupBy(items, (hit) => (hit.parentId ? hit.parentId : 'root'));
      const entryTransactionItem = childrenByParentId.root[0] as IWaterfallTransaction;
      expect(getOrderedWaterfallItems(childrenByParentId, entryTransactionItem)).toMatchSnapshot();
    });
  });

  describe('getClockSkew', () => {
    it('should adjust when child starts before parent', () => {
      const child = {
        docType: 'transaction',
        doc: {
          'timestamp.us': [0],
        },
        duration: 50,
      } as IWaterfallSpanOrTransaction;

      const parent = {
        docType: 'transaction',
        doc: {
          'timestamp.us': [100],
        },
        duration: 100,
        skew: 5,
      } as IWaterfallSpanOrTransaction;

      expect(getClockSkew(child, parent)).toBe(130);
    });

    it('should not adjust when child starts after parent has ended', () => {
      const child = {
        docType: 'transaction',
        doc: {
          'timestamp.us': [250],
        },
        duration: 50,
      } as IWaterfallSpanOrTransaction;

      const parent = {
        docType: 'transaction',
        doc: {
          'timestamp.us': [100],
        },
        duration: 100,
        skew: 5,
      } as IWaterfallSpanOrTransaction;

      expect(getClockSkew(child, parent)).toBe(0);
    });

    it('should not adjust when child starts within parent duration', () => {
      const child = {
        docType: 'transaction',
        doc: {
          'timestamp.us': [150],
        },
        duration: 50,
      } as IWaterfallSpanOrTransaction;

      const parent = {
        docType: 'transaction',
        doc: {
          'timestamp.us': [100],
        },
        duration: 100,
        skew: 5,
      } as IWaterfallSpanOrTransaction;

      expect(getClockSkew(child, parent)).toBe(0);
    });

    it('should return parent skew for spans', () => {
      const child = {
        docType: 'span',
      } as IWaterfallItem;

      const parent = {
        docType: 'span',
        doc: {
          'timestamp.us': [100],
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
        docType: 'transaction',
        doc: {
          'timestamp.us': [100],
        },
        duration: 100,
        skew: 5,
      } as IWaterfallSpanOrTransaction;

      expect(getClockSkew(child, parent)).toBe(5);
    });

    it('should handle missing parent', () => {
      const child = {
        docType: 'transaction',
      } as IWaterfallItem;

      const parent = undefined;

      expect(getClockSkew(child, parent)).toBe(0);
    });
  });

  describe('getOrphanTraceItemsCount', () => {
    const myTransactionItem = {
      'processor.event': ['transaction'],
      'trace.id': ['myTrace'],
      'transaction.id': ['myTransactionId1'],
    } as WaterfallTransaction;

    it('should return missing items count: 0 if there are no orphan items', () => {
      const traceItems: Array<WaterfallTransaction | WaterfallSpan> = [
        myTransactionItem,
        {
          'processor.event': ['span'],
          'span.id': ['mySpanId'],
          'parent.id': ['myTransactionId1'],
        } as WaterfallSpan,
      ];
      expect(getOrphanTraceItemsCount(traceItems)).toBe(0);
    });

    it('should return missing items count if there are orphan items', () => {
      const traceItems: Array<WaterfallTransaction | WaterfallSpan> = [
        myTransactionItem,
        {
          'processor.event': ['span'],
          'span.id': ['myOrphanSpanId'],
          'parent.id': ['myNotExistingTransactionId1'],
        } as WaterfallSpan,
      ];
      expect(getOrphanTraceItemsCount(traceItems)).toBe(1);
    });
  });

  describe('#trace tree', () => {
    const waterfall = getWaterfall({
      traceItems: {
        traceDocs: hits,
        errorDocs,
        exceedsMax: false,
        spanLinksCountById: {},
        traceDocsTotal: hits.length,
        maxTraceItems: 5000,
      },
      entryTransaction: {
        processor: { event: 'transaction' },
        trace: { id: 'myTraceId' },
        service: { name: 'opbeans-node' },
        transaction: {
          duration: { us: 49660 },
          name: 'GET /api',
          id: 'myTransactionId1',
        },
        timestamp: { us: 1549324795784006 },
      } as Transaction,
    });

    const tree: IWaterfallNode = {
      id: 'myTransactionId1',
      item: {
        docType: 'transaction',
        doc: {
          'agent.name': ['nodejs'],
          'processor.event': ['transaction'],
          'trace.id': ['myTraceId'],
          'service.name': ['opbeans-node'],
          'transaction.duration.us': [49660],
          'transaction.name': ['GET /api'],
          'transaction.id': ['myTransactionId1'],
          'transaction.type': ['request'],
          'timestamp.us': [1549324795784006],
        },
        id: 'myTransactionId1',
        duration: 49660,
        offset: 0,
        skew: 0,
        legendValues: { serviceName: 'opbeans-node', spanType: '' },
        color: '',
        spanLinksCount: { linkedParents: 0, linkedChildren: 0 },
      },
      children: [
        {
          id: '0-mySpanIdD-0',
          item: {
            docType: 'span',
            doc: {
              'agent.name': ['nodejs'],
              'parent.id': ['myTransactionId1'],
              'processor.event': ['span'],
              'trace.id': ['myTraceId'],
              'service.name': ['opbeans-node'],
              'transaction.id': ['myTransactionId1'],
              'span.duration.us': [47557],
              'span.name': ['GET opbeans-ruby:3000/api/products'],
              'span.id': ['mySpanIdD'],
              'span.type': ['request'],
              'timestamp.us': [1549324795785760],
            },
            id: 'mySpanIdD',
            parentId: 'myTransactionId1',
            duration: 47557,
            offset: 1754,
            skew: 0,
            legendValues: { serviceName: 'opbeans-node', spanType: '' },
            color: '',
            spanLinksCount: { linkedParents: 0, linkedChildren: 0 },
          },
          children: [],
          childrenToLoad: 1,
          level: 1,
          expanded: false,
          hasInitializedChildren: false,
        },
      ],
      level: 0,
      childrenToLoad: 1,
      expanded: true,
      hasInitializedChildren: true,
    };

    describe('buildTraceTree', () => {
      it('should build the trace tree correctly', () => {
        const result = buildTraceTree({
          waterfall,
          path: {
            criticalPathSegmentsById: {},
            showCriticalPath: false,
          },
          maxLevelOpen: 1,
          isOpen: true,
        });

        expect(result).toEqual(
          expect.objectContaining({
            item: expect.objectContaining({ id: 'myTransactionId1' }),
            level: 0,
            expanded: true,
            hasInitializedChildren: true,
          })
        );

        expect(result?.children[0]).toEqual(
          expect.objectContaining({
            item: expect.objectContaining({ id: 'mySpanIdD' }),
            level: 1,
            expanded: false,
            childrenToLoad: 1,
            children: [],
            hasInitializedChildren: false,
          })
        );
      });
    });

    describe('convertTreeToList', () => {
      it('should convert the trace tree to a list correctly', () => {
        const result = convertTreeToList(tree);

        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              item: expect.objectContaining({ id: 'myTransactionId1' }),
              level: 0,
              expanded: true,
              hasInitializedChildren: true,
              childrenToLoad: 1,
            }),
            expect.objectContaining({
              item: expect.objectContaining({ id: 'mySpanIdD' }),
              level: 1,
              expanded: false,
              hasInitializedChildren: false,
              childrenToLoad: 1,
            }),
          ])
        );
      });
    });

    describe('updateTraceTreeNode', () => {
      it('should update the "mySpanIdD" node setting "expanded" to true', () => {
        const updatedNode: IWaterfallNodeFlatten = {
          id: '0-mySpanIdD-0',
          item: {
            docType: 'span',
            doc: {
              'agent.name': ['nodejs'],
              'parent.id': ['myTransactionId1'],
              'processor.event': ['span'],
              'trace.id': ['myTraceId'],
              'service.name': ['opbeans-node'],
              'transaction.id': ['myTransactionId1'],
              'span.duration.us': [47557],
              'span.name': ['GET opbeans-ruby:3000/api/products'],
              'span.id': ['mySpanIdD'],
              'span.type': ['request'],
              'timestamp.us': [1549324795785760],
            },
            id: 'mySpanIdD',
            parentId: 'myTransactionId1',
            duration: 47557,
            offset: 1754,
            skew: 0,
            legendValues: { serviceName: 'opbeans-node', spanType: '' },
            color: '',
            spanLinksCount: { linkedParents: 0, linkedChildren: 0 },
          },
          childrenToLoad: 1,
          level: 1,
          expanded: true,
          hasInitializedChildren: false,
        };

        const result = updateTraceTreeNode({
          root: tree,
          updatedNode,
          waterfall,
          path: {
            criticalPathSegmentsById: {},
            showCriticalPath: false,
          },
        });

        expect(result).toEqual(
          expect.objectContaining({
            item: expect.objectContaining({ id: 'myTransactionId1' }),
            level: 0,
            expanded: true,
            hasInitializedChildren: true,
          })
        );

        expect(result?.children[0]).toEqual(
          expect.objectContaining({
            item: expect.objectContaining({ id: 'mySpanIdD' }),
            level: 1,
            expanded: true,
            hasInitializedChildren: true,
          })
        );

        expect(result?.children[0].children[0]).toEqual(
          expect.objectContaining({
            item: expect.objectContaining({ id: 'myTransactionId2' }),
            level: 2,
            expanded: false,
            hasInitializedChildren: false,
          })
        );
      });
    });
  });
});

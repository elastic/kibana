/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy } from 'lodash';
import { Span } from 'x-pack/plugins/apm/typings/Span';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import {
  getClockSkew,
  getWaterfallItems,
  IWaterfallItem
} from './waterfall_helpers';

describe('waterfall_helpers', () => {
  describe('getWaterfallItems', () => {
    it('should order items correctly', () => {
      const items: IWaterfallItem[] = [
        {
          id: 'd',
          parentId: 'c',
          serviceName: 'opbeans-java',
          name: 'SELECT',
          duration: 210,
          timestamp: 1536763736371000,
          offset: 0,
          skew: 0,
          docType: 'span',
          span: {
            transaction: {
              id: 'c'
            }
          } as Span
        },
        {
          id: 'b',
          parentId: 'a',
          serviceName: 'opbeans-java',
          name: 'GET [0:0:0:0:0:0:0:1]',
          duration: 4694,
          timestamp: 1536763736368000,
          offset: 0,
          skew: 0,
          docType: 'span',
          span: {
            transaction: {
              id: 'a'
            }
          } as Span
        },
        {
          id: 'b2',
          parentId: 'a',
          serviceName: 'opbeans-java',
          name: 'GET [0:0:0:0:0:0:0:1]',
          duration: 4694,
          timestamp: 1536763736367000,
          offset: 0,
          skew: 0,
          docType: 'span',
          span: {
            transaction: {
              id: 'a'
            }
          } as Span
        },
        {
          id: 'c',
          parentId: 'b',
          serviceName: 'opbeans-java',
          name: 'APIRestController#productsRemote',
          duration: 3581,
          timestamp: 1536763736369000,
          offset: 0,
          skew: 0,
          docType: 'transaction',
          transaction: {} as Transaction
        },
        {
          id: 'a',
          serviceName: 'opbeans-java',
          name: 'APIRestController#products',
          duration: 9480,
          timestamp: 1536763736366000,
          offset: 0,
          skew: 0,
          docType: 'transaction',
          transaction: {} as Transaction
        }
      ];

      const childrenByParentId = groupBy(
        items,
        hit => (hit.parentId ? hit.parentId : 'root')
      );
      const entryTransactionItem = childrenByParentId.root[0];
      expect(
        getWaterfallItems(childrenByParentId, entryTransactionItem)
      ).toMatchSnapshot();
    });
  });

  describe('getClockSkew', () => {
    it('should adjust when child starts before parent', () => {
      const item = {
        docType: 'transaction',
        timestamp: 0,
        duration: 50
      } as IWaterfallItem;

      const parentItem = {
        timestamp: 100,
        skew: 5,
        duration: 100
      } as IWaterfallItem;
      const parentTransactionSkew = 1337;

      expect(getClockSkew(item, parentTransactionSkew, parentItem)).toBe(130);
    });

    it('should adjust when child starts after parent has ended', () => {
      const item = {
        docType: 'transaction',
        timestamp: 250,
        duration: 50
      } as IWaterfallItem;

      const parentItem = {
        timestamp: 100,
        skew: 5,
        duration: 100
      } as IWaterfallItem;
      const parentTransactionSkew = 1337;

      expect(getClockSkew(item, parentTransactionSkew, parentItem)).toBe(-120);
    });

    it('should not adjust when child starts within parent duration', () => {
      const item = {
        docType: 'transaction',
        timestamp: 150,
        duration: 50
      } as IWaterfallItem;

      const parentItem = {
        timestamp: 100,
        skew: 5,
        duration: 100
      } as IWaterfallItem;
      const parentTransactionSkew = 1337;

      expect(getClockSkew(item, parentTransactionSkew, parentItem)).toBe(0);
    });

    it('should return parentTransactionSkew for spans', () => {
      const item = {
        docType: 'span'
      } as IWaterfallItem;

      const parentItem = {} as IWaterfallItem;
      const parentTransactionSkew = 1337;

      expect(getClockSkew(item, parentTransactionSkew, parentItem)).toBe(1337);
    });

    it('should handle missing parentItem', () => {
      const item = {
        docType: 'transaction'
      } as IWaterfallItem;

      const parentItem = undefined;
      const parentTransactionSkew = 1337;

      expect(getClockSkew(item, parentTransactionSkew, parentItem)).toBe(0);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy, indexBy } from 'lodash';
import { Span } from 'x-pack/plugins/apm/typings/Span';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import {
  getWaterfallItems,
  IWaterfallIndex,
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
      const itemsById: IWaterfallIndex = indexBy(items, 'id');
      const entryTransactionItem = childrenByParentId.root[0];
      expect(
        getWaterfallItems(childrenByParentId, itemsById, entryTransactionItem)
      ).toMatchSnapshot();
    });
  });
});

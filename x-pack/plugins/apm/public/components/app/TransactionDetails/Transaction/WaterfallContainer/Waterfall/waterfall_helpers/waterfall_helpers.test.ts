/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Span } from 'x-pack/plugins/apm/typings/Span';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import { getWaterfallRoot, IWaterfallItem } from './waterfall_helpers';

it('getWaterfallRoot', () => {
  const items: IWaterfallItem[] = [
    {
      id: 'd',
      parentId: 'c',
      serviceName: 'opbeans-java',
      name: 'SELECT',
      duration: 210,
      timestamp: 1536763736371000,
      offset: 0,
      docType: 'span',
      parentTransaction: {} as Transaction,
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
      docType: 'span',
      parentTransaction: {} as Transaction,
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
      docType: 'span',
      parentTransaction: {} as Transaction,
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
      docType: 'transaction',
      transaction: {} as Transaction
    }
  ];

  expect(getWaterfallRoot(items, items[4])).toEqual({
    duration: 9480,
    docType: 'transaction',
    id: 'a',
    name: 'APIRestController#products',
    offset: 0,
    serviceName: 'opbeans-java',
    timestamp: 1536763736366000,
    transaction: {},
    children: [
      {
        duration: 4694,
        docType: 'span',
        id: 'b2',
        name: 'GET [0:0:0:0:0:0:0:1]',
        offset: 1000,
        parentId: 'a',
        serviceName: 'opbeans-java',
        timestamp: 1536763736367000,
        parentTransaction: {},
        span: {
          transaction: {
            id: 'a'
          }
        },
        children: []
      },
      {
        duration: 4694,
        docType: 'span',
        id: 'b',
        name: 'GET [0:0:0:0:0:0:0:1]',
        offset: 2000,
        parentId: 'a',
        serviceName: 'opbeans-java',
        timestamp: 1536763736368000,
        parentTransaction: {},
        span: {
          transaction: {
            id: 'a'
          }
        },
        children: [
          {
            duration: 3581,
            docType: 'transaction',
            id: 'c',
            name: 'APIRestController#productsRemote',
            offset: 3000,
            parentId: 'b',
            serviceName: 'opbeans-java',
            transaction: {},
            timestamp: 1536763736369000,
            children: [
              {
                duration: 210,
                docType: 'span',
                id: 'd',
                name: 'SELECT',
                offset: 5000,
                parentId: 'c',
                serviceName: 'opbeans-java',
                timestamp: 1536763736371000,
                parentTransaction: {},
                span: {
                  transaction: {
                    id: 'c'
                  }
                },
                children: []
              }
            ]
          }
        ]
      }
    ]
  });
});

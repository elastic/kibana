/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getWaterfallRoot } from './waterfall_helpers';

it('getWaterfallRoot', () => {
  const items = [
    {
      id: 'd',
      parentId: 'c',
      serviceName: 'opbeans-java',
      name: 'SELECT',
      duration: 210,
      timestamp: '2018-09-12T14:48:56.371Z',
      eventType: 'span'
    },
    {
      id: 'b',
      parentId: 'a',
      serviceName: 'opbeans-java',
      name: 'GET [0:0:0:0:0:0:0:1]',
      duration: 4694,
      timestamp: '2018-09-12T14:48:56.368Z',
      eventType: 'span'
    },
    {
      id: 'b2',
      parentId: 'a',
      serviceName: 'opbeans-java',
      name: 'GET [0:0:0:0:0:0:0:1]',
      duration: 4694,
      timestamp: '2018-09-12T14:48:56.367Z',
      eventType: 'span'
    },
    {
      id: 'c',
      parentId: 'b',
      serviceName: 'opbeans-java',
      name: 'APIRestController#productsRemote',
      duration: 3581,
      timestamp: '2018-09-12T14:48:56.369Z',
      eventType: 'transaction'
    },
    {
      id: 'a',
      serviceName: 'opbeans-java',
      name: 'APIRestController#products',
      duration: 9480,
      timestamp: '2018-09-12T14:48:56.366Z',
      eventType: 'transaction'
    }
  ];

  expect(getWaterfallRoot(items, items[4])).toEqual({
    duration: 9480,
    eventType: 'transaction',
    id: 'a',
    name: 'APIRestController#products',
    offset: 0,
    serviceName: 'opbeans-java',
    timestamp: '2018-09-12T14:48:56.366Z',
    children: [
      {
        duration: 4694,
        eventType: 'span',
        id: 'b2',
        name: 'GET [0:0:0:0:0:0:0:1]',
        offset: 1000,
        parentId: 'a',
        serviceName: 'opbeans-java',
        timestamp: '2018-09-12T14:48:56.367Z',
        children: []
      },
      {
        duration: 4694,
        eventType: 'span',
        id: 'b',
        name: 'GET [0:0:0:0:0:0:0:1]',
        offset: 2000,
        parentId: 'a',
        serviceName: 'opbeans-java',
        timestamp: '2018-09-12T14:48:56.368Z',
        children: [
          {
            duration: 3581,
            eventType: 'transaction',
            id: 'c',
            name: 'APIRestController#productsRemote',
            offset: 3000,
            parentId: 'b',
            serviceName: 'opbeans-java',
            timestamp: '2018-09-12T14:48:56.369Z',
            children: [
              {
                duration: 210,
                eventType: 'span',
                id: 'd',
                name: 'SELECT',
                offset: 5000,
                parentId: 'c',
                serviceName: 'opbeans-java',
                timestamp: '2018-09-12T14:48:56.371Z',
                children: []
              }
            ]
          }
        ]
      }
    ]
  });
});

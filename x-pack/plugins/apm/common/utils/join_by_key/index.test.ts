/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { joinByKey } from './';

describe('joinByKey', () => {
  it('joins by a string key', () => {
    const joined = joinByKey(
      [
        {
          serviceName: 'opbeans-node',
          avg: 10,
        },
        {
          serviceName: 'opbeans-node',
          count: 12,
        },
        {
          serviceName: 'opbeans-java',
          avg: 11,
        },
        {
          serviceName: 'opbeans-java',
          p95: 18,
        },
      ],
      'serviceName'
    );

    expect(joined.length).toBe(2);

    expect(joined).toEqual([
      {
        serviceName: 'opbeans-node',
        avg: 10,
        count: 12,
      },
      {
        serviceName: 'opbeans-java',
        avg: 11,
        p95: 18,
      },
    ]);
  });

  it('joins by a record key', () => {
    const joined = joinByKey(
      [
        {
          key: {
            serviceName: 'opbeans-node',
            transactionName: '/api/opbeans-node',
          },
          avg: 10,
        },
        {
          key: {
            serviceName: 'opbeans-node',
            transactionName: '/api/opbeans-node',
          },
          count: 12,
        },
        {
          key: {
            serviceName: 'opbeans-java',
            transactionName: '/api/opbeans-java',
          },
          avg: 11,
        },
        {
          key: {
            serviceName: 'opbeans-java',
            transactionName: '/api/opbeans-java',
          },
          p95: 18,
        },
      ],
      'key'
    );

    expect(joined.length).toBe(2);

    expect(joined).toEqual([
      {
        key: {
          serviceName: 'opbeans-node',
          transactionName: '/api/opbeans-node',
        },
        avg: 10,
        count: 12,
      },
      {
        key: {
          serviceName: 'opbeans-java',
          transactionName: '/api/opbeans-java',
        },
        avg: 11,
        p95: 18,
      },
    ]);
  });
});

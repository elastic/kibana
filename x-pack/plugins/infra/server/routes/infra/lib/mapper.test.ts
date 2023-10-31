/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapToApiResponse } from './mapper';
import { GetInfraMetricsRequestBodyPayload } from '../../../../common/http_api/infra';

const metricsApiRequest: GetInfraMetricsRequestBodyPayload = {
  type: 'host',
  limit: 20,
  metrics: [
    {
      type: 'cpu',
    },
    {
      type: 'diskSpaceUsage',
    },
    {
      type: 'memory',
    },
    {
      type: 'memoryFree',
    },
    {
      type: 'normalizedLoad1m',
    },
    {
      type: 'rx',
    },
    {
      type: 'tx',
    },
  ],
  range: {
    from: '2023-04-18T11:15:31.407Z',
    to: '2023-04-18T11:15:31.407Z',
  },
  query: { bool: [{ must_not: [], filter: [], should: [], must: [] }] },
  sourceId: 'id',
};

describe('mapper', () => {
  test('should map the aggregation object to the expected response object', () => {
    const hosts = mapToApiResponse(metricsApiRequest, [
      {
        key: 'host-0',
        doc_count: 155,
        diskSpaceUsage: {
          value: 0.2040001,
        },
        memory: {
          value: 0.542838307852529,
        },
        memoryFree: {
          value: 34359.738368,
        },
        normalizedLoad1m: {
          value: 239.2040001,
        },
        tx: {
          doc_count: 155,
          result: {
            value: 100.26926542816672,
          },
        },
        rx: {
          doc_count: 155,
          result: {
            value: 3959.4930095127706,
          },
        },
        cpu: {
          doc_count: 155,
          result: {
            value: 0.13271302652800487,
          },
        },
        metadata: {
          top: [
            {
              sort: ['2023-04-04T06:35:13.793Z'],
              metrics: {
                'host.os.name': null,
                'cloud.provider': '',
              },
            },
          ],
        },
      },
    ]);

    expect(hosts).toEqual({
      type: 'host',
      nodes: [
        {
          metadata: [
            { name: 'host.os.name', value: null },
            { name: 'cloud.provider', value: null },
          ],
          metrics: [
            { name: 'cpu', value: 0.13271302652800487 },
            { name: 'diskSpaceUsage', value: 0.2040001 },
            { name: 'memory', value: 0.542838307852529 },
            { name: 'memoryFree', value: 34359.738368 },
            { name: 'normalizedLoad1m', value: 239.2040001 },
            { name: 'rx', value: 3959.4930095127706 },
            { name: 'tx', value: 100.26926542816672 },
          ],
          name: 'host-0',
        },
      ],
    });
  });
});

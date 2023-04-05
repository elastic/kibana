/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapToApiResponse } from './mapper';
import { GetHostsRequestBodyPayload } from '../../../../common/http_api/hosts';

const metricsApiRequest: GetHostsRequestBodyPayload = {
  limit: 20,
  metrics: [
    {
      type: 'cpu',
    },
    {
      type: 'diskLatency',
    },
    {
      type: 'memory',
    },
    {
      type: 'memoryTotal',
    },
    {
      type: 'rx',
    },
    {
      type: 'tx',
    },
  ],
  timeRange: {
    from: 1679991289420,
    to: 1679991290420,
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
        diskLatency: {
          doc_count: 0,
          result: {
            value: null,
          },
        },
        memory: {
          value: 0.542838307852529,
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
        memoryTotal: {
          value: 66640704.099216014,
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
      hosts: [
        {
          metadata: [
            { name: 'host.os.name', value: null },
            { name: 'cloud.provider', value: '' },
          ],
          metrics: [
            { name: 'cpu', value: 0.13271302652800487 },
            { name: 'diskLatency', value: 0 },
            { name: 'memory', value: 0.542838307852529 },
            { name: 'memoryTotal', value: 66640704.099216014 },
            { name: 'rx', value: 3959.4930095127706 },
            { name: 'tx', value: 100.26926542816672 },
          ],
          name: 'host-0',
        },
      ],
    });
  });
});

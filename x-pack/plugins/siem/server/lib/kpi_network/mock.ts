/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestBasicOptions } from '../framework/types';

export const mockOptions: RequestBasicOptions = {
  defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  sourceConfiguration: {
    fields: {
      container: 'docker.container.name',
      host: 'beat.hostname',
      message: ['message', '@message'],
      pod: 'kubernetes.pod.name',
      tiebreaker: '_doc',
      timestamp: '@timestamp',
    },
  },
  timerange: { interval: '12h', to: 1549852006071, from: 1549765606071 },
  filterQuery: {},
};

export const mockMsearchOptions = {
  body: [],
};

export const mockRequest = {
  params: {},
  payload: {
    operationName: 'GetKpiNetworkQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1557445721842, to: 1557532121842 },
      filterQuery: '',
    },
    query:
      'fragment ChartFields on KpiNetworkHistogramData {\n  key_as_string\n  doc_count\n  count {\n    value\n    __typename\n  }\n  __typename\n}\n\nquery GetKpiNetworkQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {\n  source(id: $sourceId) {\n    id\n    KpiNetwork(timerange: $timerange, filterQuery: $filterQuery) {\n      networkEvents\n      networkEventsHistogram {\n        ...ChartFields\n        __typename\n      }\n      uniqueFlowId\n      activeAgents\n      uniqueSourcePrivateIps\n      uniqueSourcePrivateIpsHistogram {\n        ...ChartFields\n        __typename\n      }\n      uniqueDestinationPrivateIps\n      uniqueDestinationPrivateIpsHistogram {\n        ...ChartFields\n        __typename\n      }\n      dnsQueries\n      tlsHandshakes\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockResponse = {
  responses: [
    {
      took: 384,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 733106,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        unique_flow_id: {
          value: 195415,
        },
      },
      status: 200,
    },
    {
      took: 224,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 480755,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        histogram: {
          buckets: [
            {
              key_as_string: '2019-05-09T23:00:00.000Z',
              key: 1557442800000,
              doc_count: 42109,
              count: {
                value: 14,
              },
            },
            {
              key_as_string: '2019-05-10T11:00:00.000Z',
              key: 1557486000000,
              doc_count: 437160,
              count: {
                value: 385,
              },
            },
            {
              key_as_string: '2019-05-10T23:00:00.000Z',
              key: 1557529200000,
              doc_count: 1486,
              count: {
                value: 7,
              },
            },
          ],
          interval: '12h',
        },
        unique_private_ips: {
          value: 387,
        },
      },
      status: 200,
    },
    {
      took: 184,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 459283,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        histogram: {
          buckets: [
            {
              key_as_string: '2019-05-09T23:00:00.000Z',
              key: 1557442800000,
              doc_count: 36253,
              count: {
                value: 11,
              },
            },
            {
              key_as_string: '2019-05-10T11:00:00.000Z',
              key: 1557486000000,
              doc_count: 421719,
              count: {
                value: 877,
              },
            },
            {
              key_as_string: '2019-05-10T23:00:00.000Z',
              key: 1557529200000,
              doc_count: 1311,
              count: {
                value: 7,
              },
            },
          ],
          interval: '12h',
        },
        unique_private_ips: {
          value: 878,
        },
      },
      status: 200,
    },
    {
      took: 64,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 10942,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      status: 200,
    },
    {
      took: 57,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 54482,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      status: 200,
    },
  ],
};

export const mockResult = {
  dnsQueries: 10942,
  networkEvents: 733106,
  tlsHandshakes: 54482,
  uniqueDestinationPrivateIps: 878,
  uniqueDestinationPrivateIpsHistogram: [
    {
      x: '2019-05-09T23:00:00.000Z',
      y: 11,
    },
    {
      x: '2019-05-10T11:00:00.000Z',
      y: 877,
    },
    {
      x: '2019-05-10T23:00:00.000Z',
      y: 7,
    },
  ],
  uniqueFlowId: 195415,
  uniqueSourcePrivateIps: 387,
  uniqueSourcePrivateIpsHistogram: [
    {
      x: '2019-05-09T23:00:00.000Z',
      y: 14,
    },
    {
      x: '2019-05-10T11:00:00.000Z',
      y: 385,
    },
    {
      x: '2019-05-10T23:00:00.000Z',
      y: 7,
    },
  ],
};

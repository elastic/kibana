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

export const mockRequest = {
  params: {},
  payload: {
    operationName: 'GetKpiHostsQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1556890277121, to: 1556976677122 },
      filterQuery: '',
    },
    query:
      'fragment ChartFields on KpiHostHistogramData {\n  x: key\n  y: count {\n    value\n    doc_count\n    __typename\n  }\n  __typename\n}\n\nquery GetKpiHostsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {\n  source(id: $sourceId) {\n    id\n    KpiHosts(timerange: $timerange, filterQuery: $filterQuery) {\n      hosts\n      hostsHistogram {\n        ...ChartFields\n        __typename\n      }\n      authSuccess\n      authSuccessHistogram {\n        ...ChartFields\n        __typename\n      }\n      authFailure\n      authFailureHistogram {\n        ...ChartFields\n        __typename\n      }\n      uniqueSourceIps\n      uniqueSourceIpsHistogram {\n        ...ChartFields\n        __typename\n      }\n      uniqueDestinationIps\n      uniqueDestinationIpsHistogram {\n        ...ChartFields\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockResponse = {
  took: 4405,
  responses: [
    {
      took: 1234,
      timed_out: false,
      _shards: {
        total: 71,
        successful: 71,
        skipped: 65,
        failed: 0,
      },
      hits: {
        max_score: null,
        hits: [],
      },
      aggregations: {
        unique_destination_ips_histogram: {
          buckets: [
            {
              key_as_string: '2019-05-03T13:00:00.000Z',
              key: 1556888400000,
              doc_count: 3158515,
              count: {
                value: 1809,
              },
            },
            {
              key_as_string: '2019-05-04T01:00:00.000Z',
              key: 1556931600000,
              doc_count: 703032,
              count: {
                value: 407,
              },
            },
            {
              key_as_string: '2019-05-04T13:00:00.000Z',
              key: 1556974800000,
              doc_count: 1780,
              count: {
                value: 64,
              },
            },
          ],
          interval: '12h',
        },
        unique_source_ips: {
          value: 1407,
        },
        hosts: {
          value: 986,
        },
        unique_source_ips_histogram: {
          buckets: [
            {
              key_as_string: '2019-05-03T13:00:00.000Z',
              key: 1556888400000,
              doc_count: 3158515,
              count: {
                value: 1182,
              },
            },
            {
              key_as_string: '2019-05-04T01:00:00.000Z',
              key: 1556931600000,
              doc_count: 703032,
              count: {
                value: 364,
              },
            },
            {
              key_as_string: '2019-05-04T13:00:00.000Z',
              key: 1556974800000,
              doc_count: 1780,
              count: {
                value: 63,
              },
            },
          ],
          interval: '12h',
        },
        hosts_histogram: {
          buckets: [
            {
              key_as_string: '2019-05-03T13:00:00.000Z',
              key: 1556888400000,
              doc_count: 3158515,
              count: {
                value: 919,
              },
            },
            {
              key_as_string: '2019-05-04T01:00:00.000Z',
              key: 1556931600000,
              doc_count: 703032,
              count: {
                value: 82,
              },
            },
            {
              key_as_string: '2019-05-04T13:00:00.000Z',
              key: 1556974800000,
              doc_count: 1780,
              count: {
                value: 4,
              },
            },
          ],
          interval: '12h',
        },
        unique_destination_ips: {
          value: 1954,
        },
      },
      status: 200,
    },
    {
      took: 320,
      timed_out: false,
      _shards: {
        total: 71,
        successful: 71,
        skipped: 65,
        failed: 0,
      },
      hits: {
        max_score: null,
        hits: [],
      },
      aggregations: {
        authentication_success: {
          doc_count: 61,
        },
        authentication_failure: {
          doc_count: 15722,
        },
        authentication_failure_histogram: {
          buckets: [
            {
              key_as_string: '2019-05-03T13:00:00.000Z',
              key: 1556888400000,
              doc_count: 11739,
              count: {
                doc_count: 11731,
              },
            },
            {
              key_as_string: '2019-05-04T01:00:00.000Z',
              key: 1556931600000,
              doc_count: 4031,
              count: {
                doc_count: 3979,
              },
            },
            {
              key_as_string: '2019-05-04T13:00:00.000Z',
              key: 1556974800000,
              doc_count: 13,
              count: {
                doc_count: 12,
              },
            },
          ],
          interval: '12h',
        },
        authentication_success_histogram: {
          buckets: [
            {
              key_as_string: '2019-05-03T13:00:00.000Z',
              key: 1556888400000,
              doc_count: 11739,
              count: {
                doc_count: 8,
              },
            },
            {
              key_as_string: '2019-05-04T01:00:00.000Z',
              key: 1556931600000,
              doc_count: 4031,
              count: {
                doc_count: 52,
              },
            },
            {
              key_as_string: '2019-05-04T13:00:00.000Z',
              key: 1556974800000,
              doc_count: 13,
              count: {
                doc_count: 1,
              },
            },
          ],
          interval: '12h',
        },
      },
      status: 200,
    },
  ],
};

export const mockResult = {
  hosts: 986,
  hostsHistogram: [
    {
      x: '2019-05-03T13:00:00.000Z',
      y: 919,
    },
    {
      x: '2019-05-04T01:00:00.000Z',
      y: 82,
    },
    {
      x: '2019-05-04T13:00:00.000Z',
      y: 4,
    },
  ],
  authSuccess: 61,
  authSuccessHistogram: [
    {
      x: '2019-05-03T13:00:00.000Z',
      y: 8,
    },
    {
      x: '2019-05-04T01:00:00.000Z',
      y: 52,
    },
    {
      x: '2019-05-04T13:00:00.000Z',
      y: 1,
    },
  ],
  authFailure: 15722,
  authFailureHistogram: [
    {
      x: '2019-05-03T13:00:00.000Z',
      y: 11731,
    },
    {
      x: '2019-05-04T01:00:00.000Z',
      y: 3979,
    },
    {
      x: '2019-05-04T13:00:00.000Z',
      y: 12,
    },
  ],
  uniqueSourceIps: 1407,
  uniqueSourceIpsHistogram: [
    {
      x: '2019-05-03T13:00:00.000Z',
      y: 1182,
    },
    {
      x: '2019-05-04T01:00:00.000Z',
      y: 364,
    },
    {
      x: '2019-05-04T13:00:00.000Z',
      y: 63,
    },
  ],
  uniqueDestinationIps: 1954,
  uniqueDestinationIpsHistogram: [
    {
      x: '2019-05-03T13:00:00.000Z',
      y: 1809,
    },
    {
      x: '2019-05-04T01:00:00.000Z',
      y: 407,
    },
    {
      x: '2019-05-04T13:00:00.000Z',
      y: 64,
    },
  ],
};

export const mockGeneralQuery = [
  {
    index: ['filebeat-*', 'auditbeat-*', 'packetbeat-*', 'winlogbeat-*'],
    allowNoIndices: true,
    ignoreUnavailable: true,
  },
  {
    aggregations: {
      hosts: { cardinality: { field: 'host.name' } },
      hosts_histogram: {
        auto_date_histogram: { field: '@timestamp', buckets: '6' },
        aggs: { count: { cardinality: { field: 'host.name' } } },
      },
      unique_source_ips: { cardinality: { field: 'source.ip' } },
      unique_source_ips_histogram: {
        auto_date_histogram: { field: '@timestamp', buckets: '6' },
        aggs: { count: { cardinality: { field: 'source.ip' } } },
      },
      unique_destination_ips: { cardinality: { field: 'destination.ip' } },
      unique_destination_ips_histogram: {
        auto_date_histogram: { field: '@timestamp', buckets: '6' },
        aggs: { count: { cardinality: { field: 'destination.ip' } } },
      },
    },
    query: {
      bool: { filter: [{ range: { '@timestamp': { gte: 1556889840660, lte: 1556976240660 } } }] },
    },
    size: 0,
    track_total_hits: false,
  },
];

export const mockAuthQuery = [
  {
    index: ['filebeat-*', 'auditbeat-*', 'packetbeat-*', 'winlogbeat-*'],
    allowNoIndices: true,
    ignoreUnavailable: true,
  },
  {
    aggs: {
      authentication_success: { filter: { term: { 'event.type': 'authentication_success' } } },
      authentication_success_histogram: {
        auto_date_histogram: { field: '@timestamp', buckets: '6' },
        aggs: { count: { filter: { term: { 'event.type': 'authentication_success' } } } },
      },
      authentication_failure: { filter: { term: { 'event.type': 'authentication_failure' } } },
      authentication_failure_histogram: {
        auto_date_histogram: { field: '@timestamp', buckets: '6' },
        aggs: { count: { filter: { term: { 'event.type': 'authentication_failure' } } } },
      },
    },
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                { match: { 'event.type': 'authentication_success' } },
                { match: { 'event.type': 'authentication_failure' } },
              ],
              minimum_should_match: 1,
            },
          },
          { range: { '@timestamp': { gte: 1556889840660, lte: 1556976240660 } } },
        ],
      },
    },
    size: 0,
    track_total_hits: false,
  },
];

export const mockMsearchOptions = {
  body: [...mockGeneralQuery, ...mockAuthQuery],
};

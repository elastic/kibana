/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultIndexPattern } from '../../../default_index_pattern';
import { RequestBasicOptions } from '../framework/types';

const FROM = new Date('2019-05-03T13:24:00.660Z').valueOf();
const TO = new Date('2019-05-04T13:24:00.660Z').valueOf();

export const mockKpiHostsOptions: RequestBasicOptions = {
  defaultIndex: defaultIndexPattern,
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
  timerange: { interval: '12h', to: TO, from: FROM },
  filterQuery: undefined,
};

export const mockKpiHostDetailsOptions: RequestBasicOptions = {
  defaultIndex: defaultIndexPattern,
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
  timerange: { interval: '12h', to: TO, from: FROM },
  filterQuery: { term: { 'host.name': 'beats-ci-immutable-ubuntu-1604-1560970771368235343' } },
};

export const mockKpiHostsRequest = {
  body: {
    operationName: 'GetKpiHostsQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: FROM, to: TO },
      filterQuery: '',
    },
    query:
      'fragment KpiHostChartFields on KpiHostHistogramData {\n  x\n  y\n  __typename\n}\n\nquery GetKpiHostsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!) {\n  source(id: $sourceId) {\n    id\n    KpiHosts(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {\n      hosts\n      hostsHistogram {\n        ...KpiHostChartFields\n        __typename\n      }\n      authSuccess\n      authSuccessHistogram {\n        ...KpiHostChartFields\n        __typename\n      }\n      authFailure\n      authFailureHistogram {\n        ...KpiHostChartFields\n        __typename\n      }\n      uniqueSourceIps\n      uniqueSourceIpsHistogram {\n        ...KpiHostChartFields\n        __typename\n      }\n      uniqueDestinationIps\n      uniqueDestinationIpsHistogram {\n        ...KpiHostChartFields\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
};

export const mockKpiHostDetailsRequest = {
  body: {
    operationName: 'GetKpiHostDetailsQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: FROM, to: TO },
      filterQuery: { term: { 'host.name': 'beats-ci-immutable-ubuntu-1604-1560970771368235343' } },
    },
    query:
      'fragment KpiHostDetailsChartFields on KpiHostHistogramData {\n  x\n  y\n  __typename\n}\n\nquery GetKpiHostDetailsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!, $hostName: String!) {\n  source(id: $sourceId) {\n    id\n    KpiHostDetails(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex, hostName: $hostName) {\n      authSuccess\n      authSuccessHistogram {\n        ...KpiHostDetailsChartFields\n        __typename\n      }\n      authFailure\n      authFailureHistogram {\n        ...KpiHostDetailsChartFields\n        __typename\n      }\n      uniqueSourceIps\n      uniqueSourceIpsHistogram {\n        ...KpiHostDetailsChartFields\n        __typename\n      }\n      uniqueDestinationIps\n      uniqueDestinationIpsHistogram {\n        ...KpiHostDetailsChartFields\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
};

const mockUniqueIpsResponse = {
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
    unique_destination_ips: {
      value: 1954,
    },
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
  },
  status: 200,
};

const mockAuthResponse = {
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
};

const mockHostsReponse = {
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
    hosts: {
      value: 986,
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
  },
  status: 200,
};

export const mockKpiHostsResponse = {
  took: 4405,
  responses: [mockHostsReponse, mockAuthResponse, mockUniqueIpsResponse],
};

export const mockKpiHostsResponseNodata = { responses: [null, null, null] };

const mockMsearchHeader = {
  index: defaultIndexPattern,
  allowNoIndices: true,
  ignoreUnavailable: true,
};

const mockHostNameFilter = {
  term: { 'host.name': 'beats-ci-immutable-ubuntu-1604-1560970771368235343' },
};
const mockTimerangeFilter = { range: { '@timestamp': { gte: FROM, lte: TO } } };

export const mockHostsQuery = [
  mockMsearchHeader,
  {
    aggregations: {
      hosts: { cardinality: { field: 'host.name' } },
      hosts_histogram: {
        auto_date_histogram: { field: '@timestamp', buckets: '6' },
        aggs: { count: { cardinality: { field: 'host.name' } } },
      },
    },
    query: {
      bool: { filter: [{ range: { '@timestamp': mockTimerangeFilter } }] },
    },
    size: 0,
    track_total_hits: false,
  },
];

const mockUniqueIpsAggs = {
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
};

export const mockKpiHostsUniqueIpsQuery = [
  mockMsearchHeader,
  {
    aggregations: mockUniqueIpsAggs,
    query: {
      bool: { filter: [mockTimerangeFilter] },
    },
    size: 0,
    track_total_hits: false,
  },
];

export const mockKpiHostDetailsUniqueIpsQuery = [
  mockMsearchHeader,
  {
    aggregations: mockUniqueIpsAggs,
    query: {
      bool: { filter: [mockHostNameFilter, mockTimerangeFilter] },
    },
    size: 0,
    track_total_hits: false,
  },
];

const mockAuthAggs = {
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
};

const mockAuthFilter = {
  bool: {
    filter: [
      {
        term: {
          'event.category': 'authentication',
        },
      },
    ],
  },
};

export const mockKpiHostsAuthQuery = [
  mockMsearchHeader,
  {
    aggs: mockAuthAggs,
    query: {
      bool: {
        filter: [mockAuthFilter, mockTimerangeFilter],
      },
    },
    size: 0,
    track_total_hits: false,
  },
];

export const mockKpiHostDetailsAuthQuery = [
  mockMsearchHeader,
  {
    aggs: mockAuthAggs,
    query: {
      bool: {
        filter: [mockHostNameFilter, mockAuthFilter, mockTimerangeFilter],
      },
    },
    size: 0,
    track_total_hits: false,
  },
];

export const mockKpiHostsMsearchOptions = {
  body: [...mockHostsQuery, ...mockKpiHostsAuthQuery, ...mockKpiHostsUniqueIpsQuery],
};

export const mockKpiHostDetailsMsearchOptions = {
  body: [...mockKpiHostDetailsAuthQuery, ...mockKpiHostDetailsUniqueIpsQuery],
};

export const mockKpiHostsQueryDsl = [
  JSON.stringify({ ...mockHostsQuery[0], body: mockHostsQuery[1] }, null, 2),
  JSON.stringify({ ...mockKpiHostsAuthQuery[0], body: mockKpiHostsAuthQuery[1] }, null, 2),
  JSON.stringify(
    { ...mockKpiHostsUniqueIpsQuery[0], body: mockKpiHostsUniqueIpsQuery[1] },
    null,
    2
  ),
];

export const mockKpiHostsResult = {
  inspect: {
    dsl: mockKpiHostsQueryDsl,
    response: [
      JSON.stringify(mockKpiHostsResponse.responses[0], null, 2),
      JSON.stringify(mockKpiHostsResponse.responses[1], null, 2),
      JSON.stringify(mockKpiHostsResponse.responses[2], null, 2),
    ],
  },
  hosts: 986,
  hostsHistogram: [
    {
      x: new Date('2019-05-03T13:00:00.000Z').valueOf(),
      y: 919,
    },
    {
      x: new Date('2019-05-04T01:00:00.000Z').valueOf(),
      y: 82,
    },
    {
      x: new Date('2019-05-04T13:00:00.000Z').valueOf(),
      y: 4,
    },
  ],
  authSuccess: 61,
  authSuccessHistogram: [
    {
      x: new Date('2019-05-03T13:00:00.000Z').valueOf(),
      y: 8,
    },
    {
      x: new Date('2019-05-04T01:00:00.000Z').valueOf(),
      y: 52,
    },
    {
      x: new Date('2019-05-04T13:00:00.000Z').valueOf(),
      y: 1,
    },
  ],
  authFailure: 15722,
  authFailureHistogram: [
    {
      x: new Date('2019-05-03T13:00:00.000Z').valueOf(),
      y: 11731,
    },
    {
      x: new Date('2019-05-04T01:00:00.000Z').valueOf(),
      y: 3979,
    },
    {
      x: new Date('2019-05-04T13:00:00.000Z').valueOf(),
      y: 12,
    },
  ],
  uniqueSourceIps: 1407,
  uniqueSourceIpsHistogram: [
    {
      x: new Date('2019-05-03T13:00:00.000Z').valueOf(),
      y: 1182,
    },
    {
      x: new Date('2019-05-04T01:00:00.000Z').valueOf(),
      y: 364,
    },
    {
      x: new Date('2019-05-04T13:00:00.000Z').valueOf(),
      y: 63,
    },
  ],
  uniqueDestinationIps: 1954,
  uniqueDestinationIpsHistogram: [
    {
      x: new Date('2019-05-03T13:00:00.000Z').valueOf(),
      y: 1809,
    },
    {
      x: new Date('2019-05-04T01:00:00.000Z').valueOf(),
      y: 407,
    },
    {
      x: new Date('2019-05-04T13:00:00.000Z').valueOf(),
      y: 64,
    },
  ],
};

export const mockKpiHostDetailsResponse = {
  took: 4405,
  responses: [mockAuthResponse, mockUniqueIpsResponse],
};

export const mockKpiHostDetailsResponseNoData = {
  took: 4405,
  responses: [null, null],
};

export const mockKpiHostDetailsDsl = [
  JSON.stringify(
    { ...mockKpiHostDetailsAuthQuery[0], body: mockKpiHostDetailsAuthQuery[1] },
    null,
    2
  ),
  JSON.stringify(
    { ...mockKpiHostDetailsUniqueIpsQuery[0], body: mockKpiHostDetailsUniqueIpsQuery[1] },
    null,
    2
  ),
];

export const mockKpiHostDetailsResult = {
  inspect: {
    dsl: mockKpiHostDetailsDsl,
    response: [
      JSON.stringify(mockKpiHostDetailsResponse.responses[0], null, 2),
      JSON.stringify(mockKpiHostDetailsResponse.responses[1], null, 2),
    ],
  },
  authSuccess: 61,
  authSuccessHistogram: [
    {
      x: new Date('2019-05-03T13:00:00.000Z').valueOf(),
      y: 8,
    },
    {
      x: new Date('2019-05-04T01:00:00.000Z').valueOf(),
      y: 52,
    },
    {
      x: new Date('2019-05-04T13:00:00.000Z').valueOf(),
      y: 1,
    },
  ],
  authFailure: 15722,
  authFailureHistogram: [
    {
      x: new Date('2019-05-03T13:00:00.000Z').valueOf(),
      y: 11731,
    },
    {
      x: new Date('2019-05-04T01:00:00.000Z').valueOf(),
      y: 3979,
    },
    {
      x: new Date('2019-05-04T13:00:00.000Z').valueOf(),
      y: 12,
    },
  ],
  uniqueSourceIps: 1407,
  uniqueSourceIpsHistogram: [
    {
      x: new Date('2019-05-03T13:00:00.000Z').valueOf(),
      y: 1182,
    },
    {
      x: new Date('2019-05-04T01:00:00.000Z').valueOf(),
      y: 364,
    },
    {
      x: new Date('2019-05-04T13:00:00.000Z').valueOf(),
      y: 63,
    },
  ],
  uniqueDestinationIps: 1954,
  uniqueDestinationIpsHistogram: [
    {
      x: new Date('2019-05-03T13:00:00.000Z').valueOf(),
      y: 1809,
    },
    {
      x: new Date('2019-05-04T01:00:00.000Z').valueOf(),
      y: 407,
    },
    {
      x: new Date('2019-05-04T13:00:00.000Z').valueOf(),
      y: 64,
    },
  ],
};

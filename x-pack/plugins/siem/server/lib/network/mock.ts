/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, FlowDirection, FlowTarget, NetworkTopNFlowFields } from '../../graphql/types';

import { NetworkTopNFlowRequestOptions } from '.';

export const mockOptions: NetworkTopNFlowRequestOptions = {
  sourceConfiguration: {
    logAlias: 'filebeat-*',
    auditbeatAlias: 'auditbeat-*',
    packetbeatAlias: 'packetbeat-*',
    winlogbeatAlias: 'winlogbeat-*',
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
  pagination: { limit: 10, cursor: null, tiebreaker: null },
  filterQuery: {},
  fields: [
    'totalCount',
    'source.ip',
    'source.domain',
    'source.__typename',
    'destination.ip',
    'destination.domain',
    'destination.__typename',
    'event.duration',
    'event.__typename',
    'network.bytes',
    'network.packets',
    'network.__typename',
    '__typename',
    'edges.cursor.value',
    'edges.cursor.__typename',
    'edges.__typename',
    'pageInfo.endCursor.value',
    'pageInfo.endCursor.__typename',
    'pageInfo.hasNextPage',
    'pageInfo.__typename',
    '__typename',
  ],
  networkTopNFlowSort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
  flowTarget: FlowTarget.source,
  flowDirection: FlowDirection.uniDirectional,
};

export const mockRequest = {
  params: {},
  payload: {
    operationName: 'GetNetworkTopNFlowQuery',
    variables: {
      filterQuery: '',
      flowDirection: FlowDirection.uniDirectional,
      flowType: FlowTarget.source,
      pagination: { limit: 10, cursor: null, tiebreaker: null },
      sourceId: 'default',
      timerange: { interval: '12h', from: 1549765830772, to: 1549852230772 },
    },
    query: `query GetNetworkTopNFlowQuery($sourceId: ID!, $flowDirection: FlowDirection!, $sort: NetworkTopNFlowSortField!, $flowTarget: FlowTarget!, $timerange: TimerangeInput!, $pagination: PaginationInput!, $filterQuery: String) {
        source(id: $sourceId) {
          id
          NetworkTopNFlow(flowDirection: $flowDirection, sort: $sort, flowTarget: $flowTarget, timerange: $timerange, pagination: $pagination, filterQuery: $filterQuery) {
            totalCount
            edges {
              node {
              source {
                ip
                domain
                count
                __typename
              }
              destination {
                ip
                domain
                count
                __typename
              }
              network {
                bytes
                packets
                direction
                __typename
              }
            __typename
            }
            cursor {
              value
              __typename
            }
            __typename
          }
          pageInfo {
            endCursor {
              value
              __typename
            }
            hasNextPage
            __typename
          }
          __typename
        }
        __typename
      }
    }`,
  },
};

export const mockResponse = {
  took: 122,
  timed_out: false,
  _shards: {
    total: 11,
    successful: 11,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    top_n_flow_count: {
      value: 545,
    },
    top_uni_flow: {
      buckets: [
        {
          key: '1.1.1.1',
          bytes: {
            value: 11276023407,
          },
          packets: {
            value: 1025631,
          },
          direction: {
            buckets: [
              {
                key: 'inbound',
              },
            ],
          },
          ip_count: {
            value: 1,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            buckets: [
              {
                key: 'test.1.net',
              },
            ],
          },
        },
        {
          key: '2.2.2.2',
          bytes: {
            value: 5469323342,
          },
          packets: {
            value: 2811441,
          },
          direction: {
            buckets: [
              {
                key: 'outbound',
              },
              {
                key: 'external',
              },
            ],
          },
          ip_count: {
            value: 2,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            buckets: [
              {
                key: 'test.2.net',
              },
            ],
          },
        },
        {
          key: '3.3.3.3',
          bytes: {
            value: 3807671322,
          },
          packets: {
            value: 4494034,
          },
          direction: {
            buckets: [
              {
                key: 'outbound',
              },
            ],
          },
          ip_count: {
            value: 5,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            buckets: [
              {
                key: 'test.3.com',
              },
              {
                key: 'test.3-duplicate.com',
              },
            ],
          },
        },
        {
          key: '4.4.4.4',
          bytes: {
            value: 166517626,
          },
          packets: {
            value: 3194782,
          },
          direction: {
            buckets: [
              {
                key: 'inbound',
              },
            ],
          },
          ip_count: {
            value: 1,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            buckets: [
              {
                key: 'test.4.com',
              },
            ],
          },
        },
        {
          key: '5.5.5.5',
          bytes: {
            value: 104785026,
          },
          packets: {
            value: 1838597,
          },
          direction: {
            buckets: [
              {
                key: 'external',
              },
            ],
          },
          ip_count: {
            value: 3,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            buckets: [
              {
                key: 'test.5.com',
              },
            ],
          },
        },
        {
          key: '6.6.6.6',
          bytes: {
            value: 28804250,
          },
          packets: {
            value: 482982,
          },
          direction: {
            buckets: [
              {
                key: 'inbound',
              },
            ],
          },
          ip_count: {
            value: 2,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 31,
            buckets: [
              {
                key: 'test.6.com',
              },
            ],
          },
        },
        {
          key: '7.7.7.7',
          bytes: {
            value: 23032363,
          },
          packets: {
            value: 400623,
          },
          direction: {
            buckets: [
              {
                key: 'inbound',
              },
            ],
          },
          ip_count: {
            value: 2,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'test.7.com',
              },
            ],
          },
        },
        {
          key: '8.8.8.8',
          bytes: {
            value: 21424889,
          },
          packets: {
            value: 344357,
          },
          direction: {
            buckets: [
              {
                key: 'inbound',
              },
            ],
          },
          ip_count: {
            value: 2,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            buckets: [
              {
                key: 'test.8.com',
              },
            ],
          },
        },
        {
          key: '9.9.9.9',
          bytes: {
            value: 19205000,
          },
          packets: {
            value: 355663,
          },
          direction: {
            buckets: [
              {
                key: 'inbound',
              },
            ],
          },
          ip_count: {
            value: 2,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            buckets: [
              {
                key: 'test.9.com',
              },
            ],
          },
        },
        {
          key: '10.10.10.10',
          bytes: {
            value: 11407633,
          },
          packets: {
            value: 199360,
          },
          direction: {
            buckets: [
              {
                key: 'inbound',
              },
            ],
          },
          ip_count: {
            value: 2,
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          domain: {
            buckets: [
              {
                key: 'test.10.com',
              },
            ],
          },
        },
        {
          key: '11.11.11.11',
          bytes: {
            value: 11393327,
          },
          direction: {
            buckets: [
              {
                key: 'inbound',
              },
            ],
          },
          timestamp: {
            value: 155052446412,
            value_as_string: '2019-02-18T21:14:24.000Z',
          },
          ip_count: {
            value: 2,
          },
          packets: {
            value: 195914,
          },
          domain: {
            buckets: [
              {
                key: 'test.11.com',
              },
            ],
          },
        },
      ],
    },
  },
};

export const mockResult = {
  edges: [
    {
      cursor: {
        tiebreaker: null,
        value: '1.1.1.1',
      },
      node: {
        _id: '1.1.1.1',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 11276023407,
          packets: 1025631,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.1.net'],
          ip: '1.1.1.1',
          count: 1,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '2.2.2.2',
      },
      node: {
        _id: '2.2.2.2',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 5469323342,
          packets: 2811441,
          direction: ['outbound', 'external'],
        },
        source: {
          domain: ['test.2.net'],
          ip: '2.2.2.2',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '3.3.3.3',
      },
      node: {
        _id: '3.3.3.3',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 3807671322,
          packets: 4494034,
          direction: ['outbound'],
        },
        source: {
          domain: ['test.3.com', 'test.3-duplicate.com'],
          ip: '3.3.3.3',
          count: 5,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '4.4.4.4',
      },
      node: {
        _id: '4.4.4.4',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 166517626,
          packets: 3194782,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.4.com'],
          ip: '4.4.4.4',
          count: 1,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '5.5.5.5',
      },
      node: {
        _id: '5.5.5.5',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 104785026,
          packets: 1838597,
          direction: ['external'],
        },
        source: {
          domain: ['test.5.com'],
          ip: '5.5.5.5',
          count: 3,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '6.6.6.6',
      },
      node: {
        _id: '6.6.6.6',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 28804250,
          packets: 482982,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.6.com'],
          ip: '6.6.6.6',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '7.7.7.7',
      },
      node: {
        _id: '7.7.7.7',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 23032363,
          packets: 400623,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.7.com'],
          ip: '7.7.7.7',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '8.8.8.8',
      },
      node: {
        _id: '8.8.8.8',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 21424889,
          packets: 344357,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.8.com'],
          ip: '8.8.8.8',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '9.9.9.9',
      },
      node: {
        _id: '9.9.9.9',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 19205000,
          packets: 355663,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.9.com'],
          ip: '9.9.9.9',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '10.10.10.10',
      },
      node: {
        _id: '10.10.10.10',
        timestamp: '2019-02-18T21:14:24.000Z',
        network: {
          bytes: 11407633,
          packets: 199360,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.10.com'],
          ip: '10.10.10.10',
          count: 2,
        },
      },
    },
  ],
  pageInfo: {
    endCursor: {
      tiebreaker: null,
      value: '10',
    },
    hasNextPage: true,
  },
  totalCount: 545,
};

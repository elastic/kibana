/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkTopNFlowRequestOptions } from '.';
import { NetworkTopNFlowDirection, NetworkTopNFlowType } from '../../graphql/types';

export const mockOptions: NetworkTopNFlowRequestOptions = {
  sourceConfiguration: {
    logAlias: 'filebeat-*',
    auditbeatAlias: 'auditbeat-*',
    packetbeatAlias: 'packetbeat-*',
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
  networkTopNFlowType: NetworkTopNFlowType.source,
  networkTopNFlowDirection: NetworkTopNFlowDirection.uniDirectional,
};

export const mockRequest = {
  params: {},
  payload: {
    operationName: 'GetNetworkTopNFlowQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1549765830772, to: 1549852230772 },
      type: 'source',
      pagination: { limit: 10, cursor: null, tiebreaker: null },
      filterQuery: '',
    },
    query:
      'query GetNetworkTopNFlowQuery($sourceId: ID!, $type: NetworkTopNFlowType!, $timerange: TimerangeInput!, $pagination: PaginationInput!, $filterQuery: String) {\n  source(id: $sourceId) {\n    id\n    NetworkTopNFlow(type: $type, timerange: $timerange, pagination: $pagination, filterQuery: $filterQuery) {\n      totalCount\n      edges {\n        node {\n          source {\n            ip\n            domain\n            __typename\n          }\n          destination {\n            ip\n            domain\n            __typename\n          }\n          event {\n            duration\n            __typename\n          }\n          network {\n            bytes\n            packets\n            __typename\n          }\n          __typename\n        }\n        cursor {\n          value\n          __typename\n        }\n        __typename\n      }\n      pageInfo {\n        endCursor {\n          value\n          __typename\n        }\n        hasNextPage\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
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
    network_top_n_flow_count: {
      value: 545,
    },
    network_top_n_flow: {
      doc_count_error_upper_bound: -1,
      sum_other_doc_count: 11343,
      buckets: [
        {
          key: '1.1.1.1',
          doc_count: 5554,
          network_bytes: {
            value: 11276023407,
          },
          domain: {
            doc_count_error_upper_bound: -1,
            sum_other_doc_count: 6249,
            buckets: [
              {
                key: 'test.1.net',
                doc_count: 195,
                network_packets: {
                  value: 1025631,
                },
                network_bytes: {
                  value: 1532853382,
                },
                event_duration: {
                  value: 10546999000000,
                },
              },
            ],
          },
        },
        {
          key: '2.2.2.2',
          doc_count: 435,
          network_bytes: {
            value: 5469323342,
          },
          domain: {
            doc_count_error_upper_bound: -1,
            sum_other_doc_count: 552,
            buckets: [
              {
                key: 'test.2.net',
                doc_count: 120,
                network_packets: {
                  value: 2811441,
                },
                network_bytes: {
                  value: 4208518310,
                },
                event_duration: {
                  value: 6905047000000,
                },
              },
            ],
          },
        },
        {
          key: '3.3.3.3',
          doc_count: 1380,
          network_bytes: {
            value: 3807671322,
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'test.3.com',
                doc_count: 1380,
                network_packets: {
                  value: 4494034,
                },
                network_bytes: {
                  value: 3807671322,
                },
                event_duration: {
                  value: 84163372000000,
                },
              },
            ],
          },
        },
        {
          key: '4.4.4.4',
          doc_count: 1434,
          network_bytes: {
            value: 166517626,
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 47,
            buckets: [
              {
                key: 'test.4.com',
                doc_count: 1387,
                network_packets: {
                  value: 3194782,
                },
                network_bytes: {
                  value: 166501082,
                },
                event_duration: {
                  value: 84652377000000,
                },
              },
            ],
          },
        },
        {
          key: '5.5.5.5',
          doc_count: 147,
          network_bytes: {
            value: 104785026,
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 42,
            buckets: [
              {
                key: 'test.5.com',
                doc_count: 105,
                network_packets: {
                  value: 1838597,
                },
                network_bytes: {
                  value: 101772016,
                },
                event_duration: {
                  value: 6570288000000,
                },
              },
            ],
          },
        },
        {
          key: '6.6.6.6',
          doc_count: 61,
          network_bytes: {
            value: 28804250,
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 31,
            buckets: [
              {
                key: 'test.6.com',
                doc_count: 30,
                network_packets: {
                  value: 482982,
                },
                network_bytes: {
                  value: 27433447,
                },
                event_duration: {
                  value: 1797471000000,
                },
              },
            ],
          },
        },
        {
          key: '7.7.7.7',
          doc_count: 1048,
          network_bytes: {
            value: 23032363,
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'test.7.com',
                doc_count: 1048,
                network_packets: {
                  value: 400623,
                },
                network_bytes: {
                  value: 23032363,
                },
                event_duration: {
                  value: 1906166000000,
                },
              },
            ],
          },
        },
        {
          key: '8.8.8.8',
          doc_count: 173,
          network_bytes: {
            value: 21424889,
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'test.8.com',
                doc_count: 173,
                network_packets: {
                  value: 344357,
                },
                network_bytes: {
                  value: 21424889,
                },
                event_duration: {
                  value: 10131251000000,
                },
              },
            ],
          },
        },
        {
          key: '9.9.9.9',
          doc_count: 84,
          network_bytes: {
            value: 19205000,
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'test.9.com',
                doc_count: 84,
                network_packets: {
                  value: 355663,
                },
                network_bytes: {
                  value: 19205000,
                },
                event_duration: {
                  value: 3802567000000,
                },
              },
            ],
          },
        },
        {
          key: '10.10.10.10',
          doc_count: 43,
          network_bytes: {
            value: 11407633,
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'test.10.com',
                doc_count: 43,
                network_packets: {
                  value: 199360,
                },
                network_bytes: {
                  value: 11407633,
                },
                event_duration: {
                  value: 2454888000000,
                },
              },
            ],
          },
        },
        {
          key: '11.11.11.11',
          doc_count: 562,
          network_bytes: {
            value: 11393327,
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'test.11.com',
                doc_count: 562,
                network_packets: {
                  value: 195914,
                },
                network_bytes: {
                  value: 11393327,
                },
                event_duration: {
                  value: 1409724000000,
                },
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
        event: {
          duration: 10546999000000,
        },
        network: {
          bytes: 1532853382,
          packets: 1025631,
        },
        source: {
          domain: 'test.1.net',
          ip: '1.1.1.1',
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
        event: {
          duration: 6905047000000,
        },
        network: {
          bytes: 4208518310,
          packets: 2811441,
        },
        source: {
          domain: 'test.2.net',
          ip: '2.2.2.2',
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
        event: {
          duration: 84163372000000,
        },
        network: {
          bytes: 3807671322,
          packets: 4494034,
        },
        source: {
          domain: 'test.3.com',
          ip: '3.3.3.3',
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
        event: {
          duration: 84652377000000,
        },
        network: {
          bytes: 166501082,
          packets: 3194782,
        },
        source: {
          domain: 'test.4.com',
          ip: '4.4.4.4',
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
        event: {
          duration: 6570288000000,
        },
        network: {
          bytes: 101772016,
          packets: 1838597,
        },
        source: {
          domain: 'test.5.com',
          ip: '5.5.5.5',
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
        event: {
          duration: 1797471000000,
        },
        network: {
          bytes: 27433447,
          packets: 482982,
        },
        source: {
          domain: 'test.6.com',
          ip: '6.6.6.6',
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
        event: {
          duration: 1906166000000,
        },
        network: {
          bytes: 23032363,
          packets: 400623,
        },
        source: {
          domain: 'test.7.com',
          ip: '7.7.7.7',
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
        event: {
          duration: 10131251000000,
        },
        network: {
          bytes: 21424889,
          packets: 344357,
        },
        source: {
          domain: 'test.8.com',
          ip: '8.8.8.8',
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
        event: {
          duration: 3802567000000,
        },
        network: {
          bytes: 19205000,
          packets: 355663,
        },
        source: {
          domain: 'test.9.com',
          ip: '9.9.9.9',
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
        event: {
          duration: 2454888000000,
        },
        network: {
          bytes: 11407633,
          packets: 199360,
        },
        source: {
          domain: 'test.10.com',
          ip: '10.10.10.10',
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

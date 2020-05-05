/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, TlsFields, FlowTargetSourceDest } from '../../graphql/types';

export const mockTlsQuery = {
  allowNoIndices: true,
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  ignoreUnavailable: true,
  body: {
    aggs: {
      count: { cardinality: { field: 'tls.server_certificate.fingerprint.sha1' } },
      sha1: {
        terms: {
          field: 'tls.server_certificate.fingerprint.sha1',
          size: 10,
          order: { _key: 'desc' },
        },
        aggs: {
          issuers: { terms: { field: 'tls.server.issuer' } },
          subjects: { terms: { field: 'tls.server.subject' } },
          not_after: { terms: { field: 'tls.server.not_after' } },
          ja3: { terms: { field: 'tls.server.ja3s' } },
        },
      },
    },
    query: {
      bool: { filter: [{ range: { '@timestamp': { gte: 1570719927430, lte: 1570806327431 } } }] },
    },
    size: 0,
    track_total_hits: false,
  },
};

export const expectedTlsEdges = [
  {
    cursor: {
      tiebreaker: null,
      value: 'fff8dc95436e0e25ce46b1526a1a547e8cf3bb82',
    },
    node: {
      _id: 'fff8dc95436e0e25ce46b1526a1a547e8cf3bb82',
      subjects: ['*.1.nflxso.net'],
      issuers: ['DigiCert SHA2 Secure Server CA'],
      ja3: ['95d2dd53a89b334cddd5c22e81e7fe61'],
      notAfter: ['2019-10-27T12:00:00.000Z'],
    },
  },
  {
    cursor: {
      tiebreaker: null,
      value: 'fd8440c4b20978b173e0910e2639d114f0d405c5',
    },
    node: {
      _id: 'fd8440c4b20978b173e0910e2639d114f0d405c5',
      subjects: ['cogocast.net'],
      issuers: ['Amazon'],
      ja3: ['a111d93cdf31f993c40a8a9ef13e8d7e'],
      notAfter: ['2020-02-01T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fcdc16645ebb3386adc96e7ba735c4745709b9dd' },
    node: {
      _id: 'fcdc16645ebb3386adc96e7ba735c4745709b9dd',
      subjects: ['player-devintever2.mountain.siriusxm.com'],
      issuers: ['Trustwave Organization Validation SHA256 CA, Level 1'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2020-03-06T21:57:09.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fccf375789cb7e671502a7b0cc969f218a4b2c70' },
    node: {
      _id: 'fccf375789cb7e671502a7b0cc969f218a4b2c70',
      subjects: ['appleid.apple.com'],
      issuers: ['DigiCert SHA2 Extended Validation Server CA'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2020-07-04T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fc4a296b706fa18ac50b96f5c0327c69db4a8981' },
    node: {
      _id: 'fc4a296b706fa18ac50b96f5c0327c69db4a8981',
      subjects: ['itunes.apple.com'],
      issuers: ['DigiCert SHA2 Extended Validation Server CA'],
      ja3: ['a441a33aaee795f498d6b764cc78989a'],
      notAfter: ['2020-03-24T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fc2cbc41f6a0e9c0118de4fe40f299f7207b797e' },
    node: {
      _id: 'fc2cbc41f6a0e9c0118de4fe40f299f7207b797e',
      subjects: ['incapsula.com'],
      issuers: ['GlobalSign CloudSSL CA - SHA256 - G3'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2020-04-04T14:05:06.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fb70d78ffa663a3a4374d841b3288d2de9759566' },
    node: {
      _id: 'fb70d78ffa663a3a4374d841b3288d2de9759566',
      subjects: ['*.siriusxm.com'],
      issuers: ['DigiCert Baltimore CA-2 G2'],
      ja3: ['535aca3d99fc247509cd50933cd71d37', '6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2021-10-27T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fb59038dcec33ab3a01a6ae60d0835ad0e04ccf0' },
    node: {
      _id: 'fb59038dcec33ab3a01a6ae60d0835ad0e04ccf0',
      subjects: ['photos.amazon.eu'],
      issuers: ['Amazon'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2020-04-23T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'f9815293c883a6006f0b2d95a4895bdc501fd174' },
    node: {
      _id: 'f9815293c883a6006f0b2d95a4895bdc501fd174',
      subjects: ['cdn.hbo.com'],
      issuers: ['Sectigo RSA Organization Validation Secure Server CA'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2021-02-10T23:59:59.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'f8db6a69797e383dca2529727369595733123386' },
    node: {
      _id: 'f8db6a69797e383dca2529727369595733123386',
      subjects: ['www.google.com'],
      issuers: ['GTS CA 1O1'],
      ja3: ['a111d93cdf31f993c40a8a9ef13e8d7e'],
      notAfter: ['2019-12-10T13:32:54.000Z'],
    },
  },
];

export const mockRequest = {
  body: {
    operationName: 'GetTlsQuery',
    variables: {
      defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      filterQuery: '',
      flowTarget: 'source',
      inspect: false,
      ip: '',
      pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
      sort: { field: '_id', direction: 'desc' },
      sourceId: 'default',
      timerange: { interval: '12h', from: 1570716261267, to: 1570802661267 },
    },
    query:
      'query GetTlsQuery($sourceId: ID!, $filterQuery: String, $flowTarget: FlowTarget!, $ip: String!, $pagination: PaginationInputPaginated!, $sort: TlsSortField!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $inspect: Boolean!) {\n  source(id: $sourceId) {\n    id\n    Tls(filterQuery: $filterQuery, flowTarget: $flowTarget, ip: $ip, pagination: $pagination, sort: $sort, timerange: $timerange, defaultIndex: $defaultIndex) {\n      totalCount\n      edges {\n        node {\n          _id\n          subjects\n          ja3\n          issuers\n          notAfter\n          __typename\n        }\n        cursor {\n          value\n          __typename\n        }\n        __typename\n      }\n      pageInfo {\n        activePage\n        fakeTotalCount\n        showMorePagesIndicator\n        __typename\n      }\n      inspect @include(if: $inspect) {\n        dsl\n        response\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
};

export const mockResponse = {
  took: 92,
  timed_out: false,
  _shards: { total: 33, successful: 33, skipped: 0, failed: 0 },
  hits: { max_score: null, hits: [] },
  aggregations: {
    sha1: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 4597,
      buckets: [
        {
          key: 'fff8dc95436e0e25ce46b1526a1a547e8cf3bb82',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1572177600000, key_as_string: '2019-10-27T12:00:00.000Z', doc_count: 1 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'DigiCert SHA2 Secure Server CA', doc_count: 1 }],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '*.1.nflxso.net', doc_count: 1 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '95d2dd53a89b334cddd5c22e81e7fe61', doc_count: 1 }],
          },
        },
        {
          key: 'fd8440c4b20978b173e0910e2639d114f0d405c5',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1580558400000, key_as_string: '2020-02-01T12:00:00.000Z', doc_count: 1 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'Amazon', doc_count: 1 }],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'cogocast.net', doc_count: 1 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'a111d93cdf31f993c40a8a9ef13e8d7e', doc_count: 1 }],
          },
        },
        {
          key: 'fcdc16645ebb3386adc96e7ba735c4745709b9dd',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1583531829000, key_as_string: '2020-03-06T21:57:09.000Z', doc_count: 1 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'Trustwave Organization Validation SHA256 CA, Level 1', doc_count: 1 },
            ],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'player-devintever2.mountain.siriusxm.com', doc_count: 1 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 1 }],
          },
        },
        {
          key: 'fccf375789cb7e671502a7b0cc969f218a4b2c70',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1593864000000, key_as_string: '2020-07-04T12:00:00.000Z', doc_count: 1 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'DigiCert SHA2 Extended Validation Server CA', doc_count: 1 }],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'appleid.apple.com', doc_count: 1 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 1 }],
          },
        },
        {
          key: 'fc4a296b706fa18ac50b96f5c0327c69db4a8981',
          doc_count: 2,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1585051200000, key_as_string: '2020-03-24T12:00:00.000Z', doc_count: 2 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'DigiCert SHA2 Extended Validation Server CA', doc_count: 2 }],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'itunes.apple.com', doc_count: 2 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'a441a33aaee795f498d6b764cc78989a', doc_count: 2 }],
          },
        },
        {
          key: 'fc2cbc41f6a0e9c0118de4fe40f299f7207b797e',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1586009106000, key_as_string: '2020-04-04T14:05:06.000Z', doc_count: 1 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'GlobalSign CloudSSL CA - SHA256 - G3', doc_count: 1 }],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'incapsula.com', doc_count: 1 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 1 }],
          },
        },
        {
          key: 'fb70d78ffa663a3a4374d841b3288d2de9759566',
          doc_count: 325,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1635336000000, key_as_string: '2021-10-27T12:00:00.000Z', doc_count: 325 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'DigiCert Baltimore CA-2 G2', doc_count: 325 }],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '*.siriusxm.com', doc_count: 325 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: '535aca3d99fc247509cd50933cd71d37', doc_count: 284 },
              { key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 39 },
            ],
          },
        },
        {
          key: 'fb59038dcec33ab3a01a6ae60d0835ad0e04ccf0',
          doc_count: 5,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1587643200000, key_as_string: '2020-04-23T12:00:00.000Z', doc_count: 5 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'Amazon', doc_count: 5 }],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'photos.amazon.eu', doc_count: 5 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 5 }],
          },
        },
        {
          key: 'f9815293c883a6006f0b2d95a4895bdc501fd174',
          doc_count: 29,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1613001599000, key_as_string: '2021-02-10T23:59:59.000Z', doc_count: 29 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'Sectigo RSA Organization Validation Secure Server CA', doc_count: 29 },
            ],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'cdn.hbo.com', doc_count: 29 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 26 }],
          },
        },
        {
          key: 'f8db6a69797e383dca2529727369595733123386',
          doc_count: 5,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1575984774000, key_as_string: '2019-12-10T13:32:54.000Z', doc_count: 5 },
            ],
          },
          issuers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'GTS CA 1O1', doc_count: 5 }],
          },
          subjects: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'www.google.com', doc_count: 5 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'a111d93cdf31f993c40a8a9ef13e8d7e', doc_count: 5 }],
          },
        },
      ],
    },
    count: { value: 364 },
  },
};

export const mockOptions = {
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
  timerange: { interval: '12h', to: 1570801871626, from: 1570715471626 },
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  filterQuery: {},
  fields: [
    'totalCount',
    '_id',
    'subjects',
    'ja3',
    'issuers',
    'notAfter',
    'edges.cursor.value',
    'pageInfo.activePage',
    'pageInfo.fakeTotalCount',
    'pageInfo.showMorePagesIndicator',
    'inspect.dsl',
    'inspect.response',
  ],
  ip: '',
  sort: { field: TlsFields._id, direction: Direction.desc },
  flowTarget: FlowTargetSourceDest.source,
};

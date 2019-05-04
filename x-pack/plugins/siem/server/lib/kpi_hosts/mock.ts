/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestBasicOptions } from '../framework/types';

export const mockOptions: RequestBasicOptions = {
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
  filterQuery: {},
};

export const mockRequest = {
  params: {},
  payload: {
    operationName: 'GetKpiHostsQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1549765830772, to: 1549852230772 },
      filterQuery: '',
    },
    query:
      'query GetKpiHostsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {\n  source(id: $sourceId) {\n    id\n    KpiHosts(timerange: $timerange, filterQuery: $filterQuery) {\n      hosts\n      agents\n      authentication {\n        success\n        failure\n        __typename\n      }\n      uniqueSourceIps\n      uniqueDestinationIps\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockResponse = {
  took: 4405,
  responses: [
    {
      took: 4404,
      timed_out: false,
      _shards: {
        total: 71,
        successful: 71,
        skipped: 64,
        failed: 0,
      },
      hits: {
        max_score: null,
        hits: [],
      },
      aggregations: {
        unique_destination_ips_histogram: {
          doc_count: 2175136,
          ips_over_time: {
            buckets: [
              {
                key_as_string: '2019-04-24T07:00:00.000Z',
                key: 1556089200000,
                doc_count: 1189146,
              },
              {
                key_as_string: '2019-04-24T19:00:00.000Z',
                key: 1556132400000,
                doc_count: 977334,
              },
              {
                key_as_string: '2019-04-25T07:00:00.000Z',
                key: 1556175600000,
                doc_count: 8656,
              },
            ],
            interval: '12h',
          },
        },
        unique_source_ips: {
          value: 11929,
        },
        hosts: {
          value: 1026,
        },
        hosts_histogram: {
          doc_count: 9681207,
          hosts_over_time: {
            buckets: [
              {
                key_as_string: '2019-04-24T07:00:00.000Z',
                key: 1556089200000,
                doc_count: 5017216,
              },
              {
                key_as_string: '2019-04-24T19:00:00.000Z',
                key: 1556132400000,
                doc_count: 4590090,
              },
              {
                key_as_string: '2019-04-25T07:00:00.000Z',
                key: 1556175600000,
                doc_count: 73901,
              },
            ],
            interval: '12h',
          },
        },
        unique_destination_ips: {
          value: 2662,
        },
        unique_source_ips_histogram: {
          doc_count: 2503604,
          ips_over_time: {
            buckets: [
              {
                key_as_string: '2019-04-24T07:00:00.000Z',
                key: 1556089200000,
                doc_count: 1419836,
              },
              {
                key_as_string: '2019-04-24T19:00:00.000Z',
                key: 1556132400000,
                doc_count: 1074440,
              },
              {
                key_as_string: '2019-04-25T07:00:00.000Z',
                key: 1556175600000,
                doc_count: 9328,
              },
            ],
            interval: '12h',
          },
        },
      },
      status: 200,
    },
    {
      took: 1124,
      timed_out: false,
      _shards: {
        total: 71,
        successful: 71,
        skipped: 64,
        failed: 0,
      },
      hits: {
        max_score: null,
        hits: [],
      },
      aggregations: {
        authentication_success: {
          doc_count: 2,
          attempts_over_time: {
            buckets: [
              {
                key_as_string: '2019-04-24T18:00:00.000Z',
                key: 1556128800000,
                doc_count: 1,
              },
              {
                key_as_string: '2019-04-24T21:00:00.000Z',
                key: 1556139600000,
                doc_count: 0,
              },
              {
                key_as_string: '2019-04-25T00:00:00.000Z',
                key: 1556150400000,
                doc_count: 0,
              },
              {
                key_as_string: '2019-04-25T03:00:00.000Z',
                key: 1556161200000,
                doc_count: 1,
              },
            ],
            interval: '3h',
          },
        },
        authentication_failure: {
          doc_count: 306495,
          attempts_over_time: {
            buckets: [
              {
                key_as_string: '2019-04-24T07:00:00.000Z',
                key: 1556089200000,
                doc_count: 220265,
              },
              {
                key_as_string: '2019-04-24T19:00:00.000Z',
                key: 1556132400000,
                doc_count: 86135,
              },
              {
                key_as_string: '2019-04-25T07:00:00.000Z',
                key: 1556175600000,
                doc_count: 95,
              },
            ],
            interval: '12h',
          },
        },
      },
      status: 200,
    },
  ],
};

export const mockResult = {
  hosts: 1026,
  hostsHistogram: [
    {
      doc_count: 5017216,
      key: 1556089200000,
      key_as_string: '2019-04-24T07:00:00.000Z',
    },
    {
      doc_count: 4590090,
      key: 1556132400000,
      key_as_string: '2019-04-24T19:00:00.000Z',
    },
    {
      doc_count: 73901,
      key: 1556175600000,
      key_as_string: '2019-04-25T07:00:00.000Z',
    },
  ],
  authSuccess: 2,
  authSuccessHistogram: [
    {
      doc_count: 1,
      key: 1556128800000,
      key_as_string: '2019-04-24T18:00:00.000Z',
    },
    {
      doc_count: 0,
      key: 1556139600000,
      key_as_string: '2019-04-24T21:00:00.000Z',
    },
    {
      doc_count: 0,
      key: 1556150400000,
      key_as_string: '2019-04-25T00:00:00.000Z',
    },
    {
      doc_count: 1,
      key: 1556161200000,
      key_as_string: '2019-04-25T03:00:00.000Z',
    },
  ],
  authFailure: 306495,
  authFailureHistogram: [
    {
      doc_count: 220265,
      key: 1556089200000,
      key_as_string: '2019-04-24T07:00:00.000Z',
    },
    {
      doc_count: 86135,
      key: 1556132400000,
      key_as_string: '2019-04-24T19:00:00.000Z',
    },
    {
      doc_count: 95,
      key: 1556175600000,
      key_as_string: '2019-04-25T07:00:00.000Z',
    },
  ],
  uniqueSourceIps: 11929,
  uniqueSourceIpsHistogram: [
    {
      doc_count: 1419836,
      key: 1556089200000,
      key_as_string: '2019-04-24T07:00:00.000Z',
    },
    {
      doc_count: 1074440,
      key: 1556132400000,
      key_as_string: '2019-04-24T19:00:00.000Z',
    },
    {
      doc_count: 9328,
      key: 1556175600000,
      key_as_string: '2019-04-25T07:00:00.000Z',
    },
  ],
  uniqueDestinationIps: 2662,
  uniqueDestinationIpsHistogram: [
    {
      doc_count: 1189146,
      key: 1556089200000,
      key_as_string: '2019-04-24T07:00:00.000Z',
    },
    {
      doc_count: 977334,
      key: 1556132400000,
      key_as_string: '2019-04-24T19:00:00.000Z',
    },
    {
      doc_count: 8656,
      key: 1556175600000,
      key_as_string: '2019-04-25T07:00:00.000Z',
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
      hosts: {
        cardinality: {
          field: 'host.name',
        },
      },
      hosts_histogram: {
        filter: {
          bool: {
            should: [
              {
                exists: {
                  field: 'host.name',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        aggregations: {
          hosts_over_time: {
            auto_date_histogram: {
              field: '@timestamp',
              buckets: '6',
            },
          },
        },
      },
      unique_source_ips: {
        cardinality: {
          field: 'source.ip',
        },
      },
      unique_source_ips_histogram: {
        filter: {
          bool: {
            should: [
              {
                exists: {
                  field: 'source.ip',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        aggregations: {
          ips_over_time: {
            auto_date_histogram: {
              field: '@timestamp',
              buckets: 6,
            },
          },
        },
      },
      unique_destination_ips: {
        cardinality: {
          field: 'destination.ip',
        },
      },
      unique_destination_ips_histogram: {
        filter: {
          bool: {
            should: [
              {
                exists: {
                  field: 'destination.ip',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        aggregations: {
          ips_over_time: {
            auto_date_histogram: {
              field: '@timestamp',
              buckets: 6,
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: 1556091284295,
                lte: 1556177684295,
              },
            },
          },
        ],
      },
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
      authentication_success: {
        filter: {
          term: {
            'event.type': 'authentication_success',
          },
        },
        aggs: {
          attempts_over_time: {
            auto_date_histogram: {
              field: '@timestamp',
              buckets: 6,
            },
          },
        },
      },
      authentication_failure: {
        filter: {
          term: {
            'event.type': 'authentication_failure',
          },
        },
        aggs: {
          attempts_over_time: {
            auto_date_histogram: {
              field: '@timestamp',
              buckets: 6,
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  match: {
                    'event.type': 'authentication_success',
                  },
                },
                {
                  match: {
                    'event.type': 'authentication_failure',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            range: {
              '@timestamp': {
                gte: 1556091284295,
                lte: 1556177684295,
              },
            },
          },
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

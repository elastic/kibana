/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';

import {
  Direction,
  NetworkTopCountriesRequestOptions,
  NetworkQueries,
  FlowTargetSourceDest,
  NetworkTopTablesFields,
} from '../../../../../../../common/search_strategy';

export const mockOptions: NetworkTopCountriesRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  factoryQueryType: NetworkQueries.topCountries,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  flowTarget: FlowTargetSourceDest.destination,
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  sort: { field: NetworkTopTablesFields.bytes_in, direction: Direction.desc },
  timerange: { interval: '12h', from: '2020-09-13T09:58:58.637Z', to: '2020-09-14T09:58:58.637Z' },
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 62,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: 0, max_score: 0, hits: [] },
    aggregations: {
      sha1: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
      count: { value: 0 },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  ...mockSearchStrategyResponse,
  edges: [],
  inspect: {
    dsl: [
      '{\n  "allowNoIndices": true,\n  "index": [\n    "apm-*-transaction*",\n    "auditbeat-*",\n    "endgame-*",\n    "filebeat-*",\n    "logs-*",\n    "packetbeat-*",\n    "winlogbeat-*"\n  ],\n  "ignoreUnavailable": true,\n  "body": {\n    "aggregations": {\n      "top_countries_count": {\n        "cardinality": {\n          "field": "destination.geo.country_iso_code"\n        }\n      },\n      "destination": {\n        "terms": {\n          "field": "destination.geo.country_iso_code",\n          "size": 10,\n          "order": {\n            "bytes_in": "desc"\n          }\n        },\n        "aggs": {\n          "bytes_in": {\n            "sum": {\n              "field": "source.bytes"\n            }\n          },\n          "bytes_out": {\n            "sum": {\n              "field": "destination.bytes"\n            }\n          },\n          "flows": {\n            "cardinality": {\n              "field": "network.community_id"\n            }\n          },\n          "source_ips": {\n            "cardinality": {\n              "field": "source.ip"\n            }\n          },\n          "destination_ips": {\n            "cardinality": {\n              "field": "destination.ip"\n            }\n          }\n        }\n      }\n    },\n    "query": {\n      "bool": {\n        "filter": [\n          "{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"match_all\\":{}}],\\"should\\":[],\\"must_not\\":[]}}",\n          {\n            "range": {\n              "@timestamp": {\n                "gte": "2020-09-13T09:58:58.637Z",\n                "lte": "2020-09-14T09:58:58.637Z",\n                "format": "strict_date_optional_time"\n              }\n            }\n          }\n        ]\n      }\n    }\n  },\n  "size": 0,\n  "track_total_hits": false\n}',
    ],
  },
  pageInfo: { activePage: 0, fakeTotalCount: 0, showMorePagesIndicator: false },
  totalCount: 0,
};

export const expectedDsl = {
  allowNoIndices: true,
  index: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  ignoreUnavailable: true,
  body: {
    aggregations: {
      top_countries_count: { cardinality: { field: 'destination.geo.country_iso_code' } },
      destination: {
        terms: { field: 'destination.geo.country_iso_code', size: 10, order: { bytes_in: 'desc' } },
        aggs: {
          bytes_in: { sum: { field: 'source.bytes' } },
          bytes_out: { sum: { field: 'destination.bytes' } },
          flows: { cardinality: { field: 'network.community_id' } },
          source_ips: { cardinality: { field: 'source.ip' } },
          destination_ips: { cardinality: { field: 'destination.ip' } },
        },
      },
    },
    query: {
      bool: {
        filter: [
          '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
          {
            range: {
              '@timestamp': {
                gte: '2020-09-13T09:58:58.637Z',
                lte: '2020-09-14T09:58:58.637Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
  },
  size: 0,
  track_total_hits: false,
};

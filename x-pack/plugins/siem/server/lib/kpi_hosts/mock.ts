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
  took: 577,
  responses: [
    {
      took: 2603,
      timed_out: false,
      _shards: {
        total: 67,
        successful: 67,
        skipped: 60,
        failed: 0,
      },
      hits: {
        total: {
          value: 9665113,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        unique_source_ips: {
          value: 10503,
        },
        hosts: {
          value: 711,
        },
        unique_destination_ips: {
          value: 2380,
        },
        agents: {
          value: 23,
        },
      },
      status: 200,
    },
    {
      took: 3884,
      timed_out: false,
      _shards: {
        total: 67,
        successful: 67,
        skipped: 60,
        failed: 0,
      },
      hits: {
        total: {
          value: 661651,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        authentication_success: {
          doc_count: 2,
        },
        authentication_failure: {
          doc_count: 661649,
        },
      },
      status: 200,
    },
  ],
};

export const mockResult = {
  hosts: 711,
  agents: 23,
  authentication: {
    success: 2,
    failure: 661649,
  },
  uniqueSourceIps: 10503,
  uniqueDestinationIps: 2380,
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
      agents: { cardinality: { field: 'agent.id' } },
      unique_source_ips: { cardinality: { field: 'source.ip' } },
      unique_destination_ips: { cardinality: { field: 'destination.ip' } },
    },
    query: {
      bool: { filter: [{ range: { '@timestamp': { gte: 1549765606071, lte: 1549852006071 } } }] },
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
        filter: { term: { 'event.type': 'authentication_success' } },
        aggs: { attempts_over_time: { auto_date_histogram: { field: '@timestamp', buckets: 10 } } },
      },
      authentication_failure: {
        filter: { term: { 'event.type': 'authentication_failure' } },
        aggs: { attempts_over_time: { auto_date_histogram: { field: '@timestamp', buckets: 10 } } },
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
          { range: { '@timestamp': { gte: 1549765606071, lte: 1549852006071 } } },
        ],
      },
    },
    size: 0,
    track_total_hits: true,
  },
];

export const mockMsearchOptions = {
  body: [...mockGeneralQuery, ...mockAuthQuery],
};

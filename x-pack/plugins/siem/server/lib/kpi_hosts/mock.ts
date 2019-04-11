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

export const mockMsearchOptions = {
  body: [],
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
      'query GetKpiHostsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {\n  source(id: $sourceId) {\n    id\n    KpiHosts(timerange: $timerange, filterQuery: $filterQuery) {\n      hosts\n      installedPackages\n      processCount\n      authenticationSuccess\n      authenticationFailure\n      fimEvents\n      auditdEvents\n      winlogbeatEvents\n      filebeatEvents\n      sockets\n      uniqueSourceIps\n      uniqueDestinationIps\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockResponse = {
  took: 577,
  responses: [
    {
      took: 577,
      timed_out: false,
      _shards: {
        total: 47,
        successful: 47,
        skipped: 40,
        failed: 0,
      },
      hits: {
        total: {
          value: 1225373,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        unique_source_ips: {
          value: 7600,
        },
        host: {
          value: 6,
        },
        unique_destination_ips: {
          value: 1946,
        },
        sockets: {
          value: 0,
        },
        installedPackages: {
          value: 0,
        },
      },
      status: 200,
    },
    {
      took: 265,
      timed_out: false,
      _shards: {
        total: 47,
        successful: 47,
        skipped: 40,
        failed: 0,
      },
      hits: {
        total: {
          value: 11,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      status: 200,
    },
    {
      took: 243,
      timed_out: false,
      _shards: {
        total: 47,
        successful: 47,
        skipped: 40,
        failed: 0,
      },
      hits: {
        total: {
          value: 27,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        authentication_success: {
          doc_count: 27,
        },
        authentication_failure: {
          doc_count: 0,
        },
      },
      status: 200,
    },
    {
      took: 231,
      timed_out: false,
      _shards: {
        total: 47,
        successful: 47,
        skipped: 40,
        failed: 0,
      },
      hits: {
        total: {
          value: 0,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      status: 200,
    },
    {
      took: 273,
      timed_out: false,
      _shards: {
        total: 47,
        successful: 47,
        skipped: 40,
        failed: 0,
      },
      hits: {
        total: {
          value: 0,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      status: 200,
    },
    {
      took: 240,
      timed_out: false,
      _shards: {
        total: 47,
        successful: 47,
        skipped: 40,
        failed: 0,
      },
      hits: {
        total: {
          value: 8787,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      status: 200,
    },
    {
      took: 231,
      timed_out: false,
      _shards: {
        total: 47,
        successful: 47,
        skipped: 40,
        failed: 0,
      },
      hits: {
        total: {
          value: 956933,
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
  auditdEvents: 0,
  authenticationFailure: 0,
  authenticationSuccess: 27,
  filebeatEvents: 956933,
  fimEvents: 0,
  hosts: 6,
  installedPackages: 0,
  processCount: 11,
  sockets: 0,
  uniqueDestinationIps: 1946,
  uniqueSourceIps: 7600,
  winlogbeatEvents: 8787,
};

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
    operationName: 'GetKpiNetworkQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1549765830772, to: 1549852230772 },
      filterQuery: '',
    },
    query:
      'query GetKpiNetworkQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {\n  source(id: $sourceId) {\n    id\n    KpiNetwork(timerange: $timerange, filterQuery: $filterQuery) {\n      networkEvents\n      uniqueFlowId\n      activeAgents\n      uniqueSourcePrivateIps\n      uniqueDestinationPrivateIps\n      dnsQueries\n      tlsHandshakes\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockResponse = {
  responses: [
    {
      took: 258,
      timed_out: false,
      _shards: { total: 26, successful: 26, skipped: 0, failed: 0 },
      hits: { total: { value: 950867, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: { unique_flow_id: { value: 50243 }, active_agents: { value: 15 } },
      status: 200,
    },
    {
      took: 323,
      timed_out: false,
      _shards: { total: 26, successful: 26, skipped: 0, failed: 0 },
      hits: { total: { value: 406839, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: { unique_private_ips: { value: 383 } },
      status: 200,
    },
    {
      took: 323,
      timed_out: false,
      _shards: { total: 26, successful: 26, skipped: 0, failed: 0 },
      hits: { total: { value: 406839, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: { unique_private_ips: { value: 18 } },
      status: 200,
    },
    {
      took: 9,
      timed_out: false,
      _shards: { total: 38, successful: 38, skipped: 36, failed: 0 },
      hits: { total: { value: 278, relation: 'eq' }, max_score: null, hits: [] },
      status: 200,
    },
    {
      took: 60,
      timed_out: false,
      _shards: { total: 38, successful: 38, skipped: 36, failed: 0 },
      hits: { total: { value: 10000, relation: 'gte' }, max_score: null, hits: [] },
      status: 200,
    },
  ],
};

export const mockResult = {
  networkEvents: 950867,
  uniqueFlowId: 50243,
  activeAgents: 15,
  uniqueSourcePrivateIps: 383,
  uniqueDestinationPrivateIps: 18,
  dnsQueries: 278,
  tlsHandshakes: 10000,
};

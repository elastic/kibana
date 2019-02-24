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
    operationName: 'GetNetworkTopNFlowQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1549765830772, to: 1549852230772 },
      filterQuery: '',
    },
    query:
      'query GetKpiNetworkQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {\n  source(id: $sourceId) {\n    id\n     KpiNetwork(timerange: $timerange, filterQuery: $filterQuery) {\n       networkEvents\n       uniqueFlowId\n       activeAgents\n     }\n   }\n }',
  },
  query: {},
};

export const mockResponse = {
  took: 89,
  timed_out: false,
  _shards: { total: 18, successful: 18, skipped: 0, failed: 0 },
  hits: { total: { value: 950867, relation: 'eq' }, max_score: null, hits: [] },
  aggregations: { unique_flow_id: { value: 50243 }, active_agents: { value: 15 } },
};

export const mockResult = {
  networkEvents: 950867,
  uniqueFlowId: 50243,
  activeAgents: 15,
};

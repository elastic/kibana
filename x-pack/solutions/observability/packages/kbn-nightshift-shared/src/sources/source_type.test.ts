/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchSourceTypes } from './source_type';

describe('matchSourceTypes', () => {
  it('matches the built-in logs, traces and metrics bases', () => {
    expect(matchSourceTypes('logs-*')).toEqual(['logs']);
    expect(matchSourceTypes('filebeat-*')).toEqual(['logs']);
    expect(matchSourceTypes('logs.otel.queries-test')).toEqual(['logs']);
    expect(matchSourceTypes('traces-apm*')).toEqual(['traces']);
    expect(matchSourceTypes('metrics-system.cpu-*')).toEqual(['metrics']);
    expect(matchSourceTypes('metricbeat-*')).toEqual(['metrics']);
  });

  it('returns every type prefix a name matches', () => {
    expect(matchSourceTypes('logs-traces-*')).toEqual(['logs', 'traces']);
    expect(matchSourceTypes('metrics-logs-*')).toEqual(['logs', 'metrics']);
  });

  it('lets one type segment win over a dataset token', () => {
    expect(matchSourceTypes('metrics-logstash.node-*')).toEqual(['metrics']);
    expect(matchSourceTypes('metrics-microsoft_sqlserver.transaction_log-*')).toEqual(['metrics']);
    expect(matchSourceTypes('logs-foo.metrics-*')).toEqual(['logs']);
  });

  it('treats ::data like the index name and ::failures as no match', () => {
    expect(matchSourceTypes('logs-*::data')).toEqual(['logs']);
    expect(matchSourceTypes('logs-*::failures')).toEqual([]);
  });

  it('classifies a $ view name the same way as an index name', () => {
    expect(matchSourceTypes('$.logs.nginx')).toEqual(['logs']);
  });

  it('matches nothing for a name outside every pattern', () => {
    expect(matchSourceTypes('my-app-*')).toEqual([]);
    expect(matchSourceTypes('apm-*')).toEqual([]);
    expect(matchSourceTypes('*')).toEqual([]);
  });
});

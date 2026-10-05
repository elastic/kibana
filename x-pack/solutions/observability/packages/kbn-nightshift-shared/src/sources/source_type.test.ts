/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  matchSourceTypes,
  toSourceTypePatternTokens,
  uniqueSourceTypePatternTokens,
} from './source_type';

describe('matchSourceTypes', () => {
  it('matches the built-in logs, traces and metrics bases', () => {
    expect(matchSourceTypes({ name: 'logs-*' })).toEqual(['logs']);
    expect(matchSourceTypes({ name: 'filebeat-*' })).toEqual(['logs']);
    expect(matchSourceTypes({ name: 'logs.otel.queries-test' })).toEqual(['logs']);
    expect(matchSourceTypes({ name: 'traces-apm*' })).toEqual(['traces']);
    expect(matchSourceTypes({ name: 'metrics-system.cpu-*' })).toEqual(['metrics']);
    expect(matchSourceTypes({ name: 'metricbeat-*' })).toEqual(['metrics']);
  });

  it('matches a configured token exactly and not as a glob', () => {
    const patterns = { logs: ['my-app-*'], traces: ['apm-*'] };

    expect(matchSourceTypes({ name: 'my-app-*', patterns })).toEqual(['logs']);
    expect(matchSourceTypes({ name: 'my-app-0001', patterns })).toEqual([]);
    expect(matchSourceTypes({ name: 'apm-*', patterns })).toEqual(['traces']);
  });

  it('returns every type a name matches, with no precedence', () => {
    expect(matchSourceTypes({ name: 'logs-traces-*' })).toEqual(['logs', 'traces']);
    expect(matchSourceTypes({ name: 'metrics-logs-*' })).toEqual(['logs', 'metrics']);
  });

  it('treats ::data like the index name and ::failures as no match', () => {
    expect(matchSourceTypes({ name: 'logs-*::data' })).toEqual(['logs']);
    expect(matchSourceTypes({ name: 'logs-*::failures' })).toEqual([]);
  });

  it('classifies a $ view name the same way as an index name', () => {
    expect(matchSourceTypes({ name: '$.logs.nginx' })).toEqual(['logs']);
  });

  it('matches nothing for a name outside every pattern', () => {
    expect(matchSourceTypes({ name: 'my-app-*' })).toEqual([]);
    expect(matchSourceTypes({ name: '*' })).toEqual([]);
  });
});

describe('toSourceTypePatternTokens', () => {
  it('splits on commas and drops blanks and exclusion tokens', () => {
    expect(toSourceTypePatternTokens('logs-*, -logstash*, filebeat-*,, my-app-*')).toEqual([
      'logs-*',
      'filebeat-*',
      'my-app-*',
    ]);
  });
});

describe('uniqueSourceTypePatternTokens', () => {
  it('flattens several lists and drops duplicates', () => {
    expect(uniqueSourceTypePatternTokens(['traces-apm*,apm-*', 'apm-*,traces-*.otel-*'])).toEqual([
      'traces-apm*',
      'apm-*',
      'traces-*.otel-*',
    ]);
  });
});

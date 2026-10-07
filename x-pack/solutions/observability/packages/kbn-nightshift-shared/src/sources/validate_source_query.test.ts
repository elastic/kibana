/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  analyzeSourceQuery,
  getSourceCommandQuery,
  hasMultipleSourceIndices,
  validateSourceQuery,
} from './validate_source_query';

const expectType = (esql: string, type: string): void => {
  expect(analyzeSourceQuery({ esql })).toEqual({ type });
};

const expectTypeError = (esql: string, messagePart: string): void => {
  expect(analyzeSourceQuery({ esql })).toEqual({
    error: expect.stringContaining(messagePart),
  });
};

const expectRejected = (esql: string, messagePart: string) => {
  expect(validateSourceQuery(esql)).toContain(messagePart);
};

describe('validateSourceQuery', () => {
  describe('accepts', () => {
    it.each([
      'FROM logs-*',
      'FROM logs-nginx-*, logs-apache-* | WHERE status >= 500',
      'FROM logs-* | WHERE host.name == "a" | WHERE status >= 500',
      'from logs-* | where status >= 500',
      'TS metrics-*',
      'TS metrics-* | WHERE host.name == "a"',
      'FROM <logs-{now/d}>',
      'FROM *',
      'FROM $.logs.nginx',
      'FROM $.logs.*',
      'FROM remote:logs-*',
      'FROM logs-*, remote:logs-* | WHERE x > 1',
      'FROM *:logs-*',
      'TS remote:metrics-*',
      'FROM logs-* METADATA _id',
      'FROM logs-* METADATA _id, _source | WHERE x > 1',
      'TS metrics-* METADATA _id',
      'FROM logs-*, -remote:*',
    ])('%s', (esql) => {
      expect(validateSourceQuery(esql)).toBeUndefined();
    });
  });

  describe('rejects', () => {
    it('a query that does not parse', () => {
      expectRejected('FROM logs-* | WHERE', 'Invalid ES|QL query');
    });

    it.each([
      'FROM logs-*::failures',
      'FROM remote:logs-*::failures',
      'FROM "logs-*::failures"',
      'FROM logs-*, metrics-*::failures',
    ])('a selector other than data in %s', (esql) => {
      expectRejected(esql, 'only ::data is supported');
    });

    it('a first command that is not FROM or TS', () => {
      expectRejected('ROW a = 1', 'must start with FROM or TS');
      expectRejected('SHOW INFO', 'must start with FROM or TS');
    });

    it.each([
      ['EVAL', 'FROM logs-* | EVAL x = 1'],
      ['STATS', 'FROM logs-* | STATS c = COUNT(*)'],
      ['LIMIT', 'FROM logs-* | LIMIT 10'],
      ['KEEP', 'FROM logs-* | WHERE x > 1 | KEEP x'],
      ['SORT', 'FROM logs-* | SORT @timestamp'],
    ])('%s after the source command', (command, esql) => {
      expectRejected(esql, `Command "${command}" is not allowed`);
    });

    // Assumption check against @elastic/esql: Walker.commands must surface commands that live
    // inside a subquery, otherwise this rule would let branching queries through.
    it('a subquery inside WHERE', () => {
      expectRejected(
        'FROM logs-* | WHERE host.name IN (FROM hosts | STATS BY host.name)',
        'is not allowed'
      );
    });

    it('a Nightshift source view', () => {
      expectRejected(
        'FROM $.nightshift.sources.*',
        'Nightshift source views cannot be used as a source'
      );
      expectRejected(
        'FROM $.nightshift.sources.default.abc',
        'found "$.nightshift.sources.default.abc"'
      );
      expectRejected(
        'FROM logs-*, $.nightshift.sources.marketing.foo | WHERE status >= 500',
        'found "$.nightshift.sources.marketing.foo"'
      );
    });

    it('a $ wildcard that overlaps the Nightshift source namespace', () => {
      expectRejected('FROM $.*', 'found "$.*"');
      expectRejected('FROM $.nightshift.*', 'found "$.nightshift.*"');
      expectRejected('FROM logs-*, $.nightshift.* | WHERE status >= 500', 'found "$.nightshift.*"');
      // Requires a hyphen the old `…sources.x` example did not have.
      expectRejected('FROM $.*.sources.*-*', 'found "$.*.sources.*-*"');
      expectRejected('FROM $.*-*', 'found "$.*-*"');
    });

    it('a Nightshift source view on a remote cluster', () => {
      expectRejected(
        'FROM remote:$.nightshift.sources.*',
        'Nightshift source views cannot be used as a source'
      );
      expectRejected('FROM *:$.nightshift.*', 'found "*:$.nightshift.*"');
    });
  });
});

describe('source type', () => {
  it('derives one type when every index matches that type', () => {
    expectType('FROM logs-*', 'logs');
    expectType('FROM logs-* METADATA _id', 'logs');
    expectType('FROM logs-*, filebeat-*', 'logs');
    expectType('FROM logs.otel.queries-test', 'logs');
    expectType('FROM traces-apm*', 'traces');
    expectType('FROM metrics-system.cpu-*', 'metrics');
    expectType('TS metrics-*', 'metrics');
    expectType('TS my-tsdb-*', 'metrics');
    expectType('FROM my-a-*, my-b-*', 'unknown');
    expectType('FROM apm-*', 'unknown');
    expectType('FROM metrics-logstash.node-*', 'metrics');
    expectType('FROM metrics-microsoft_sqlserver.transaction_log-*', 'metrics');
    expectType('FROM remote:logs-*', 'logs');
    expectType('FROM *:logs-*, cluster:filebeat-*', 'logs');
    expectType('FROM remote:metrics-logstash.node-*', 'metrics');
    expectType('TS remote:my-tsdb-*', 'metrics');
    expectType('FROM logs-*, -remote:*', 'logs');
    expectType('FROM logs-*, cluster:-traces-*', 'logs');
    expectType('FROM logs-foo.metrics-*', 'logs');
    // The `+01:00` form only parses quoted.
    expectType('FROM "<logs-{now/d{yyyy.MM.dd|+01:00}}>"', 'logs');
    expectType('FROM "<logs-{now/d{yyyy.MM.dd|+01:00}}>", logs-*', 'logs');
    expectType('FROM remote:<logs-{now/d}>', 'logs');
    expectType('FROM <app-{now/d}-logs-{now/d}>', 'logs');
    expectType('FROM <app-{now/d}-logs-{now/d}>, logs-*', 'logs');
  });

  it('rejects an unscoped wildcard', () => {
    expectTypeError('FROM *', 'unscoped wildcard');
    expectTypeError('FROM *-*', 'unscoped wildcard');
    expectTypeError('FROM *log*', 'unscoped wildcard');
    expectTypeError('FROM cluster:*', 'Index "cluster:*" is an unscoped wildcard');
    expectTypeError('FROM *:*', 'Index "*:*" is an unscoped wildcard');
    expectTypeError('FROM "remote:*"', 'unscoped wildcard');
    expectTypeError('FROM `*`', 'unscoped wildcard');
  });

  it('rejects indices of more than one type', () => {
    expectTypeError('FROM logs-*, traces-*', 'mixes logs (logs-*) and traces (traces-*)');
    expectTypeError('FROM logs-*, my-app-*', 'mixes logs (logs-*) and unknown (my-app-*)');
    expectTypeError('FROM traces-apm*, apm-*', 'mixes traces (traces-apm*) and unknown (apm-*)');
    expectTypeError('TS logs-*', 'mixes logs (logs-*) and metrics (TS)');
    expectTypeError(
      'FROM remote:logs-*, other:traces-*',
      'mixes logs (remote:logs-*) and traces (other:traces-*)'
    );
  });

  it('rejects one index that matches more than one type', () => {
    expectTypeError('FROM logs-traces-*', 'matches more than one kind of data (logs, traces)');
    expectTypeError('FROM metrics-logs-*', 'matches more than one kind of data (logs, metrics)');
    expectTypeError('TS logs-traces-*', 'matches more than one kind of data (logs, traces)');
  });
});

describe('analyzeSourceQuery', () => {
  it('returns the structural error without classifying', () => {
    expect(analyzeSourceQuery({ esql: 'ROW a = 1' })).toEqual({
      error: expect.stringContaining('must start with FROM or TS'),
    });
  });
});

describe('getSourceCommandQuery', () => {
  it('keeps only the source command', () => {
    expect(getSourceCommandQuery('FROM logs-a, logs-b* | WHERE status >= 500 | WHERE x == 1')).toBe(
      'FROM logs-a, logs-b*'
    );
    expect(getSourceCommandQuery('ts metrics-* | where host.name == "a"')).toBe('TS metrics-*');
  });
});

describe('hasMultipleSourceIndices', () => {
  it('is false for a single source', () => {
    expect(hasMultipleSourceIndices('FROM logs-* | WHERE status >= 500')).toBe(false);
    expect(hasMultipleSourceIndices('TS metrics-*')).toBe(false);
  });

  it('is true when FROM names several indices', () => {
    expect(hasMultipleSourceIndices('FROM logs-a, logs-b* | WHERE status >= 500')).toBe(true);
    expect(hasMultipleSourceIndices('FROM remote:logs-a, logs-b')).toBe(true);
  });

  it('ignores an exclusion when counting targets', () => {
    expect(hasMultipleSourceIndices('FROM logs-*, -remote:*')).toBe(false);
  });
});

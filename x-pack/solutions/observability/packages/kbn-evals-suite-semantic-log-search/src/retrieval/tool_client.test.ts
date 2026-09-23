/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { CORPORA } from '../corpora';
import { executeGetLogGroups, executeGetLogs, executeGetLogsSemantic } from './tool_client';

const corpus = CORPORA.sigevents_postgres_timeout;

const log = {
  warning: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
} as unknown as ToolingLog;

/** Returns the tool payload as the `_execute` route wraps it. */
const fetchReturning = (data: unknown): HttpHandler =>
  jest.fn().mockResolvedValue({ results: [{ type: 'other', data }] }) as unknown as HttpHandler;

const run = (data: unknown) =>
  executeGetLogGroups({ fetch: fetchReturning(data), log, connectorId: 'c', corpus });

const logGroup = (message: string, count: number) => ({
  type: 'log',
  pattern: message,
  count,
  sample: { message },
});

describe('executeGetLogGroups', () => {
  it('maps log groups, reading the message from the sample', async () => {
    const output = await run({ groups: [logGroup('connection refused', 12)] });

    expect(output.patterns).toEqual([
      { pattern: 'connection refused', message: 'connection refused', count: 12 },
    ]);
  });

  it('carries no relevanceScore, because the tool reports no score', async () => {
    const output = await run({ groups: [logGroup('connection refused', 12)] });

    expect(output.patterns[0]).not.toHaveProperty('relevanceScore');
  });

  it('drops APM span exception groups and reports how many', async () => {
    // These carry no `pattern` at all: they are grouped by `error.grouping_key`, which lives in
    // `sample`. Scoring them would dilute precision for reasons unrelated to ranking.
    const output = await run({
      groups: [
        { type: 'spanException', count: 900, sample: { 'error.grouping_key': 'abc123' } },
        logGroup('connection refused', 12),
        { type: 'spanException', count: 800, sample: { 'error.grouping_key': 'def456' } },
      ],
    });

    expect(output.patterns).toHaveLength(1);
    expect(output.patterns[0].message).toBe('connection refused');
    expect(output.droppedNonLogGroups).toBe(2);
  });

  it('resolves a logException message from error.exception.message', async () => {
    // The exception variants categorize `error.exception.message`, not `message`, so without this
    // the ground truth would have empty text to match against.
    const output = await run({
      groups: [
        {
          type: 'logException',
          pattern: 'NullPointerException at',
          count: 4,
          sample: { 'error.exception.message': 'NullPointerException at Foo.bar' },
        },
      ],
    });

    expect(output.patterns[0].message).toBe('NullPointerException at Foo.bar');
  });

  it('falls back to the pattern when the sample carries no message', async () => {
    const output = await run({ groups: [{ type: 'log', pattern: 'only a pattern', count: 3 }] });

    expect(output.patterns[0].message).toBe('only a pattern');
  });

  it('reports zero dropped groups when every group is a log group', async () => {
    const output = await run({ groups: [logGroup('a', 2), logGroup('b', 1)] });

    expect(output.droppedNonLogGroups).toBe(0);
  });

  it('throws when the groups key is absent, naming it', async () => {
    // This tool reports no `totalCount`, so the shared field-drift guard cannot fire for it: a
    // renamed key would otherwise read as "the corpus had nothing".
    await expect(run({ patterns: [] })).rejects.toThrow(/no "groups" key/);
  });

  it('accepts an empty groups array as a real empty result', async () => {
    const output = await run({ groups: [] });

    expect(output.patterns).toEqual([]);
    expect(output.droppedNonLogGroups).toBe(0);
  });

  it('applies the shared candidate budget and records the pre-cap count', async () => {
    const groups = Array.from({ length: corpus.maxPatterns + 5 }, (_unused, index) =>
      logGroup(`pattern ${index}`, 100 - index)
    );

    const output = await run({ groups });

    expect(output.patterns).toHaveLength(corpus.maxPatterns);
    expect(output.returnedBeforeCap).toBe(corpus.maxPatterns + 5);
  });

  it('reports totalCount as 0, because the tool does not send one', async () => {
    const output = await run({ groups: [logGroup('a', 2)] });

    expect(output.totalCount).toBe(0);
  });

  it('forwards the question as a kqlFilter, so every arm gets the same input', async () => {
    const fetch = fetchReturning({ groups: [logGroup('a', 1)] });
    await executeGetLogGroups({
      fetch,
      log,
      connectorId: 'c',
      corpus,
      kqlFilter: 'message: connection or message: failures',
    });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.tool_id).toBe('observability.get_log_groups');
    expect(body.tool_params).toEqual({
      start: corpus.timeRange.start,
      end: corpus.timeRange.end,
      index: corpus.target,
      limit: corpus.maxPatterns,
      kqlFilter: 'message: connection or message: failures',
    });
  });

  it('omits kqlFilter when none is given rather than sending an empty one', async () => {
    const fetch = fetchReturning({ groups: [logGroup('a', 1)] });
    await executeGetLogGroups({ fetch, log, connectorId: 'c', corpus });

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.tool_params).not.toHaveProperty('kqlFilter');
  });
});

describe('the other two arms keep their own payload keys', () => {
  it('reads get_logs from data.categories', async () => {
    const fetch = fetchReturning({
      categories: [{ pattern: 'p', count: 5, sample: { message: 'm' } }],
      totalCount: 5,
    });

    const output = await executeGetLogs({ fetch, log, connectorId: 'c', corpus });

    expect(output.patterns).toEqual([{ pattern: 'p', message: 'm', count: 5 }]);
    expect(output.droppedNonLogGroups).toBeUndefined();
  });

  it('reads get_logs_semantic from data.patterns and keeps the score', async () => {
    const fetch = fetchReturning({
      patterns: [{ pattern: 'p', count: 5, sample: { message: 'm' }, relevanceScore: 3.4 }],
      totalCount: 5,
    });

    const output = await executeGetLogsSemantic({
      fetch,
      log,
      connectorId: 'c',
      corpus,
      semanticFilter: 'connection failures',
    });

    expect(output.patterns[0].relevanceScore).toBe(3.4);
    expect(output.droppedNonLogGroups).toBeUndefined();
  });
});

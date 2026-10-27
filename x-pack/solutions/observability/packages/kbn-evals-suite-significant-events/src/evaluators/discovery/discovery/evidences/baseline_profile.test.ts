/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { baselineProfileEvaluator, measureBaseline } from './baseline_profile';

const COLUMNS = [
  { name: 'count', type: 'long' },
  { name: 'earliest', type: 'date' },
  { name: 'latest', type: 'date' },
  { name: 'day', type: 'date' },
];

/** A baseline result: one row per day, oldest first, as the agent's day-bucket query returns it. */
const baselineStep = (counts: number[]): ConverseStep =>
  ({
    type: 'tool_call',
    tool_id: 'platform_core_execute_esql',
    tool_call_id: 'c1',
    params: { query: 'any: the result is read by its columns, not by the query text' },
    results: [
      {
        type: 'esql_results',
        data: {
          columns: COLUMNS,
          values: counts.map((count, i) => [count, null, null, `2026-10-${16 + i}T00:00:00.000Z`]),
        },
      },
    ],
  } as unknown as ConverseStep);

const sampleStep = {
  type: 'tool_call',
  tool_id: 'platform_core_execute_esql',
  tool_call_id: 'c0',
  params: { query: 'FROM logs | LIMIT 5' },
  results: [
    {
      type: 'esql_results',
      data: { columns: [{ name: 'body.text', type: 'text' }], values: [['a failing row']] },
    },
  ],
} as unknown as ConverseStep;

const evaluate = (steps: ConverseStep[], expectedBaseline?: unknown) =>
  baselineProfileEvaluator.evaluate({
    input: { detections: [] },
    output: { significantEvents: [], steps } as never,
    expected: { expected_baseline: expectedBaseline } as never,
    metadata: null,
  });

const STEADY = { failed_days: [7, 8], days: [7, 8], factor: [0.5, 2] } as const;
const SURGE = { failed_days: [7, 8], days: [7, 8], factor: [5, 40] } as const;
// The first day is partial (the window starts mid-day) and so is the last (today).
const steadyDays = [429, 1440, 1440, 1440, 1440, 1440, 1440, 800];
const surgeDays = [429, 1440, 1440, 1440, 1440, 1440, 28800, 24000];

describe('measureBaseline', () => {
  it('counts the days it occurred on and compares the last complete day with the earlier ones', () => {
    expect(measureBaseline(steadyDays.map((count, i) => ({ day: `d${i}`, count })))).toEqual({
      days: 8,
      failedDays: 8,
      factor: 1,
    });
  });

  it('leaves the factor unmeasured when no complete day comes before the last', () => {
    expect(measureBaseline([5, 10, 4].map((count, i) => ({ day: `d${i}`, count }))).factor).toBe(
      undefined
    );
    expect(
      measureBaseline([5, 10, 10, 4].map((count, i) => ({ day: `d${i}`, count }))).factor
    ).toBe(1);
  });
});

describe('baselineProfileEvaluator', () => {
  it('is unavailable when the scenario seeds no baseline', async () => {
    expect((await evaluate([baselineStep(steadyDays)])).score).toBeNull();
  });

  it('scores 0 when the agent never obtained a per-day result, whatever else it ran', async () => {
    const result = await evaluate([sampleStep], STEADY);

    expect(result.score).toBe(0);
    expect(result.label).toBe('not-run');
  });

  it.each([
    ['a steady failure', steadyDays, STEADY],
    ['a surge on an old rate', surgeDays, SURGE],
  ])('scores 1 when the result matches the seeded pattern: %s', async (_name, days, seeded) => {
    expect((await evaluate([sampleStep, baselineStep(days)], seeded)).score).toBe(1);
  });

  it.each([
    ['a surge where a steady failure was seeded', surgeDays, STEADY, /20\.0×/],
    ['a steady failure where a surge was seeded', steadyDays, SURGE, /1\.0×/],
    [
      'fewer failing days than seeded',
      // ES|QL returns no row for a day without failures, so the days are simply absent.
      [1440, 1440, 1440, 1440, 800],
      STEADY,
      /5 of 5 days/,
    ],
  ])('scores 0 for %s', async (_name, days, seeded, explanation) => {
    const result = await evaluate([baselineStep(days)], seeded);

    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(explanation);
  });

  it('scores 1 when any per-day result matches, whichever the agent ran first', async () => {
    const seeded = [baselineStep(surgeDays), baselineStep(steadyDays)];

    expect((await evaluate(seeded, STEADY)).score).toBe(1);
    expect((await evaluate([...seeded].reverse(), STEADY)).score).toBe(1);
  });

  it('scores 0 when none of several per-day results matches, naming the first problem', async () => {
    const result = await evaluate([baselineStep(surgeDays), baselineStep(surgeDays)], STEADY);

    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(/first of 2.*20\.0×/);
  });

  it('ignores a per-day result of a query that does not contain the seeded phrase', async () => {
    const seeded = { ...STEADY, phrase: 'checkout session creation failed' };
    const otherScope = baselineStep(steadyDays);
    const ownScope = {
      ...baselineStep(steadyDays),
      params: {
        query: 'FROM logs | WHERE MATCH_PHRASE(body.text, "checkout session creation failed")',
      },
    } as unknown as ConverseStep;

    const unscoped = await evaluate([otherScope], seeded);
    expect(unscoped.score).toBe(0);
    expect(unscoped.explanation).toMatch(/seeded failure phrase/);
    expect((await evaluate([otherScope, ownScope], seeded)).score).toBe(1);
  });

  it('scores 0 when the factor is asked for but the window is too short to measure it', async () => {
    const result = await evaluate([baselineStep([5, 10, 4])], {
      failed_days: [3, 3],
      days: [3, 3],
      factor: [0.5, 2],
    });

    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(/unmeasured/);
  });
});

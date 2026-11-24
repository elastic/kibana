/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { extractOrderedToolCalls, isRecord } from '../../utils/tool_usage';
import type { DiscoveryEvaluator, ExpectedBaseline } from '../../types';

/** One day of a baseline result: the failures counted on that day. */
interface DayCount {
  day: string;
  count: number;
}

/** What a baseline result shows: the days the failure occurred on, and its last day against the earlier ones. */
export interface MeasuredBaseline {
  days: number;
  failedDays: number;
  /** The last complete day over the median of the complete days before it; undefined with no earlier day. */
  factor: number | undefined;
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * The per-day counts of an `esql_results` payload that has a `day` and a `count` column, which is the
 * shape of a baseline query's result. Found by its columns, never by wording; scoped to the seeded
 * failure by the query text (see `baselineResults`). `days` counts the rows returned: ES|QL omits
 * buckets with no rows, so it is the days that have rows.
 */
const toDayCounts = (data: Record<string, unknown>): DayCount[] | undefined => {
  const { columns, values } = data;
  if (!Array.isArray(columns) || !Array.isArray(values)) return undefined;
  const names = columns.map((column) => (isRecord(column) ? column.name : undefined));
  const [dayAt, countAt] = [names.indexOf('day'), names.indexOf('count')];
  if (dayAt < 0 || countAt < 0) return undefined;
  const rows = values.flatMap((row) =>
    Array.isArray(row) && typeof row[dayAt] === 'string' && typeof row[countAt] === 'number'
      ? [{ day: row[dayAt] as string, count: row[countAt] as number }]
      : []
  );
  return rows.length > 0 ? rows.sort((a, b) => a.day.localeCompare(b.day)) : undefined;
};

/**
 * What the day counts show. The first day is partial (the window starts at `now-7d`) and so is the
 * last (today), so only the days between them are complete.
 */
export const measureBaseline = (rows: readonly DayCount[]): MeasuredBaseline => {
  const complete = rows.slice(1, -1);
  const earlier = complete.slice(0, -1);
  const baseline = earlier.length > 0 ? median(earlier.map(({ count }) => count)) : 0;
  return {
    days: rows.length,
    failedDays: rows.filter(({ count }) => count > 0).length,
    factor:
      baseline > 0 && complete.length > 0
        ? complete[complete.length - 1].count / baseline
        : undefined,
  };
};

/**
 * The baseline results the agent obtained, in call order. With a `phrase`, only results of a query
 * that contains it count: a per-day count of another scope is not this failure's baseline.
 */
export const baselineResults = (steps: ConverseStep[], phrase?: string): DayCount[][] =>
  extractOrderedToolCalls(steps).flatMap(({ params, results }) => {
    if (
      phrase !== undefined &&
      !(typeof params.query === 'string' && params.query.includes(phrase))
    ) {
      return [];
    }
    return results.flatMap((result) => {
      const counts =
        isRecord(result) && result.type === 'esql_results' && isRecord(result.data)
          ? toDayCounts(result.data)
          : undefined;
      return counts ? [counts] : [];
    });
  });

const isWithin = (value: number, [min, max]: readonly [number, number]): boolean =>
  value >= min && value <= max;

/** What differs between what was measured and what the scenario seeded, if anything. */
const problemWith = (
  measured: MeasuredBaseline,
  expected: ExpectedBaseline
): string | undefined => {
  if (
    !isWithin(measured.failedDays, expected.failed_days) ||
    !isWithin(measured.days, expected.days)
  ) {
    return `the failure occurred on ${measured.failedDays} of ${
      measured.days
    } days, outside the seeded ${expected.failed_days.join('–')} of ${expected.days.join('–')}`;
  }
  if (expected.factor) {
    if (measured.factor === undefined) return 'the factor against the earlier days is unmeasured';
    if (!isWithin(measured.factor, expected.factor)) {
      return `the last complete day was ${measured.factor.toFixed(
        1
      )}× the earlier days, outside the seeded ${expected.factor.join('–')}×`;
    }
  }
  return undefined;
};

/**
 * CODE evaluator: for a seeded scenario, the agent ran the baseline profile and what that result
 * shows (days the failure occurred on, last day against the earlier ones) matches the seeded
 * pattern. It reads the query result in the trace, so it does not depend on how the description
 * words it; the description itself is graded by the LLM evaluators.
 */
export const baselineProfileEvaluator: DiscoveryEvaluator = {
  name: 'baseline_profile',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output, expected }) => {
    const seeded = expected?.expected_baseline;
    if (!seeded) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'The scenario seeds no baseline pattern to compare with',
      });
    }
    const candidates = baselineResults(output.steps ?? [], seeded.phrase);
    if (candidates.length === 0) {
      return Promise.resolve({
        score: 0,
        label: 'not-run',
        explanation: seeded.phrase
          ? 'The agent never obtained a per-day count from a query for the seeded failure phrase'
          : 'The agent never obtained a baseline result (a per-day count of the failure)',
      });
    }
    // A flawed first attempt, or a per-day count of another scope, is not the baseline: any one
    // result that matches the seeded pattern is enough.
    const problems = candidates.map((rows) => problemWith(measureBaseline(rows), seeded));
    const problem = problems.every((issue) => issue !== undefined) ? problems[0] : undefined;
    return Promise.resolve({
      score: problem ? 0 : 1,
      explanation: problem
        ? `Baseline result${
            candidates.length > 1 ? ` (first of ${candidates.length})` : ''
          }: ${problem}`
        : 'A baseline result matches the seeded pattern',
    });
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateBySeed, gateCandidate } from './gate';
import type { RunSummary, TaskRun } from './runner';

const run = (
  seedId: string,
  reward: number | null,
  { caseId = seedId, costUsd = 0.5, executionSuccess = reward !== null } = {}
): TaskRun => ({
  exampleId: caseId,
  caseId,
  seedId,
  control: false,
  tier: 'easy',
  rollout: 0,
  question: caseId,
  plausibleFlags: [],
  rcaAccuracy: reward,
  hallucination: 0,
  control_score: null,
  reward,
  executionSuccess,
  toolCalls: 10,
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  llmCalls: 0,
  latencyMs: 0,
  costUsd,
  tracePath: '',
});

const summary = (label: string, runs: TaskRun[]): RunSummary => {
  const scored = runs.filter((each) => each.reward !== null);
  return {
    label,
    configHash: label,
    telemetryVariant: 'full',
    agentConnectorId: 'test',
    runs,
    meanReward: scored.reduce((total, each) => total + (each.reward ?? 0), 0) / scored.length,
    scoredRuns: scored.length,
    executionSuccessRate: runs.filter((each) => each.executionSuccess).length / runs.length,
    meanRcaAccuracy: null,
    meanHallucination: null,
    meanControl: null,
    totalCostUsd: runs.reduce((total, each) => total + each.costUsd, 0),
    meanToolCalls: 10,
    meanLatencyMs: 0,
  };
};

const seeds = (count: number) => Array.from({ length: count }, (unused, i) => `incident-${i}`);

describe('aggregateBySeed', () => {
  it('averages the tasks of one incident and ignores unscored runs', () => {
    const aggregates = aggregateBySeed([
      run('a', 1, { caseId: 'a-easy' }),
      run('a', 0, { caseId: 'a-hard' }),
      run('a', null, { caseId: 'a-crash' }),
    ]);
    expect(aggregates.get('a')?.reward).toBe(0.5);
    expect(aggregates.get('a')?.rewards).toEqual([1, 0]);
    // The crash still cost money.
    expect(aggregates.get('a')?.cost).toBe(0.5);
  });

  it('drops an incident with no scored run', () => {
    expect(aggregateBySeed([run('a', null)]).has('a')).toBe(false);
  });
});

describe('gateCandidate', () => {
  it('accepts a clear win on many incidents at equal cost', () => {
    const ids = seeds(20);
    const result = gateCandidate({
      incumbent: summary(
        'i',
        ids.map((id) => run(id, 0.3))
      ),
      candidate: summary(
        'c',
        ids.map((id) => run(id, 1))
      ),
    });
    expect(result.accepted).toBe(true);
    expect(result.acceptedVia).toBe('quality');
    expect(result.seeds).toBe(20);
  });

  it('rejects when nothing changed', () => {
    const ids = seeds(10);
    const result = gateCandidate({
      incumbent: summary(
        'i',
        ids.map((id) => run(id, 1))
      ),
      candidate: summary(
        'c',
        ids.map((id) => run(id, 1))
      ),
    });
    expect(result.accepted).toBe(false);
  });

  it('rejects a candidate that wins by crashing on hard incidents', () => {
    const ids = seeds(20);
    const incumbent = summary(
      'i',
      ids.map((id, i) => run(id, i < 10 ? 1 : 0))
    );
    // Same answers where it answers, but the hard half crash: scored reward goes up.
    const candidate = summary(
      'c',
      ids.map((id, i) => run(id, i < 10 ? 1 : i < 18 ? null : 1))
    );
    const result = gateCandidate({ incumbent, candidate });
    expect(result.accepted).toBe(false);
    expect(result.reasons.join(' ')).toContain('execution success fell');
  });

  it('reports no paired incidents rather than accepting', () => {
    const result = gateCandidate({
      incumbent: summary('i', [run('a', null)]),
      candidate: summary('c', [run('a', 1)]),
    });
    expect(result.accepted).toBe(false);
    expect(result.reasons).toContain('no incident was scored on both lanes');
  });

  it('accepts a cheaper candidate at equal quality via the cost path', () => {
    const ids = seeds(20);
    const result = gateCandidate({
      incumbent: summary(
        'i',
        ids.map((id) => run(id, 1, { costUsd: 1 }))
      ),
      candidate: summary(
        'c',
        ids.map((id) => run(id, 1, { costUsd: 0.5 }))
      ),
    });
    expect(result.costPerSolvedCiHigh).toBeLessThan(0);
    expect(result.accepted).toBe(true);
    expect(result.acceptedVia).toBe('cost');
  });
});

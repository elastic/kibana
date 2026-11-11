/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunSummary, TaskRun } from './runner';

export interface GateResult {
  accepted: boolean;
  /** Two-sided coverage of the reported intervals, e.g. 0.8 for the 10th–90th percentile. */
  confidence?: number;
  acceptedVia: 'quality' | 'cost' | null;
  /** Incidents scored on both sides; only these enter the paired comparison. */
  seeds: number;
  meanDelta: number;
  ciLow: number;
  ciHigh: number;
  /** Δ(USD per unit of reward), candidate − incumbent. Negative is cheaper. */
  costPerSolvedDelta: number;
  costPerSolvedCiLow: number;
  costPerSolvedCiHigh: number;
  incumbentCostPerSolved: number;
  candidateCostPerSolved: number;
  incumbentExecutionSuccess: number;
  candidateExecutionSuccess: number;
  improvements: string[];
  regressions: string[];
  costRatio: number;
  reasons: string[];
}

interface SeedAggregate {
  /** Mean over the cluster's scored runs. */
  reward: number;
  /** Mean cost over every run of the cluster, scored or not: a crash still costs money. */
  cost: number;
  rewards: number[];
}

/** Deterministic PRNG seeded from a string, so a gate verdict is reproducible. */
const createRandom = (seed: string) => {
  let state = 0;
  for (let i = 0; i < seed.length; i++) state = (state * 31 + seed.charCodeAt(i)) % 2 ** 31;
  return {
    int: (max: number): number => {
      state = (1103515245 * state + 12345) % 2 ** 31;
      return Math.floor((state / 2 ** 31) * max);
    },
  };
};

/**
 * Clusters runs by incident. Tasks of one incident (granularity and offset variants) and rollouts
 * of one task are not independent observations; resampling them as rows would manufacture
 * significance that the number of incidents cannot support.
 */
export const aggregateBySeed = (runs: TaskRun[]): Map<string, SeedAggregate> => {
  const groups = new Map<string, TaskRun[]>();
  for (const run of runs) groups.set(run.seedId, [...(groups.get(run.seedId) ?? []), run]);
  const aggregates = new Map<string, SeedAggregate>();
  for (const [seedId, group] of groups) {
    const rewards = group
      .map(({ reward }) => reward)
      .filter((reward): reward is number => reward !== null);
    if (rewards.length === 0) continue;
    aggregates.set(seedId, {
      reward: rewards.reduce((total, value) => total + value, 0) / rewards.length,
      cost: group.reduce((total, { costUsd }) => total + costUsd, 0) / group.length,
      rewards,
    });
  }
  return aggregates;
};

/** Ratio of sums, so an incident never solved cannot contribute an infinite per-seed ratio. */
const costPerSolved = (seeds: string[], aggregates: Map<string, SeedAggregate>): number => {
  let cost = 0;
  let reward = 0;
  for (const seedId of seeds) {
    const aggregate = aggregates.get(seedId);
    if (!aggregate) continue;
    cost += aggregate.cost;
    reward += aggregate.reward;
  }
  return reward === 0 ? Number.POSITIVE_INFINITY : cost / reward;
};

const percentile = (sorted: number[], fraction: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))] ?? 0;

/**
 * Paired accept test, clustered by incident, with two acceptance paths. Intervals are two-sided at
 * \`confidence\` (default 0.8: the low end is a one-sided 90% bound), so an accept means "better
 * with 90% confidence", which needs about 2.3× fewer samples than a 95% two-sided interval:
 *
 * - **quality**: reward CI excludes 0 and cost is at most `maxCostRatio` of the incumbent's;
 * - **cost**: reward non-inferior (CI low above `−nonInferiorityMargin`) and USD per unit of
 *   reward significantly lower.
 *
 * Either way improvements must outnumber capped regressions, and execution success must not drop
 * by more than `maxExecutionDrop`: ORCA leaves crashed and timed-out runs unscored, so without that
 * guard a candidate that gives up on hard incidents scores better by not answering them.
 */
export const gateCandidate = ({
  incumbent,
  candidate,
  maxRegressionShare = 0.05,
  maxCostRatio = 1.1,
  iterations = 10_000,
  regressionEpsilon = 0.05,
  nonInferiorityMargin = 0.02,
  maxExecutionDrop = 0.03,
  confidence = 0.8,
}: {
  incumbent: RunSummary;
  candidate: RunSummary;
  maxRegressionShare?: number;
  maxCostRatio?: number;
  iterations?: number;
  regressionEpsilon?: number;
  nonInferiorityMargin?: number;
  maxExecutionDrop?: number;
  confidence?: number;
}): GateResult => {
  const incumbentBySeed = aggregateBySeed(incumbent.runs);
  const candidateBySeed = aggregateBySeed(candidate.runs);
  const seeds = [...incumbentBySeed.keys()].filter((seedId) => candidateBySeed.has(seedId));

  const rewardDelta = (seedId: string): number =>
    (candidateBySeed.get(seedId)?.reward ?? 0) - (incumbentBySeed.get(seedId)?.reward ?? 0);

  const deltas = seeds.map(rewardDelta);
  const meanDelta = deltas.reduce((total, delta) => total + delta, 0) / (deltas.length || 1);
  const incumbentCostPerSolved = costPerSolved(seeds, incumbentBySeed);
  const candidateCostPerSolved = costPerSolved(seeds, candidateBySeed);

  const random = createRandom(`gate:${incumbent.configHash}:${candidate.configHash}`);
  const rewardMeans: number[] = [];
  const costDeltas: number[] = [];
  for (let iteration = 0; iteration < iterations && seeds.length > 0; iteration++) {
    const sample: string[] = [];
    let rewardSum = 0;
    for (let i = 0; i < seeds.length; i++) {
      const seedId = seeds[random.int(seeds.length)];
      sample.push(seedId);
      rewardSum += rewardDelta(seedId);
    }
    rewardMeans.push(rewardSum / seeds.length);
    costDeltas.push(
      costPerSolved(sample, candidateBySeed) - costPerSolved(sample, incumbentBySeed)
    );
  }
  rewardMeans.sort((a, b) => a - b);
  costDeltas.sort((a, b) => a - b);

  const tail = (1 - confidence) / 2;
  const ciLow = percentile(rewardMeans, tail);
  const ciHigh = percentile(rewardMeans, 1 - tail);
  const costPerSolvedCiLow = percentile(costDeltas, tail);
  const costPerSolvedCiHigh = percentile(costDeltas, 1 - tail);

  const improvements = seeds.filter((seedId) => rewardDelta(seedId) > regressionEpsilon);
  // A cluster regresses only when every scored run got worse than every incumbent run: most runs
  // score 0 or 1, and one flaky investigation must not read as a regression.
  const regressions = seeds.filter((seedId) => {
    const before = incumbentBySeed.get(seedId)?.rewards ?? [];
    const after = candidateBySeed.get(seedId)?.rewards ?? [];
    if (rewardDelta(seedId) >= -regressionEpsilon) return false;
    return Math.max(...after) < Math.min(...before) - regressionEpsilon;
  });

  const costRatio = candidate.totalCostUsd / (incumbent.totalCostUsd || Number.EPSILON);
  const qualityWin = seeds.length > 0 && ciLow > 0 && costRatio <= maxCostRatio;
  const costWin =
    seeds.length > 0 &&
    ciLow > -nonInferiorityMargin &&
    costDeltas.length > 0 &&
    costPerSolvedCiHigh < 0;
  const maxRegressions = Math.max(2, Math.ceil(maxRegressionShare * seeds.length));
  // A quality win must improve more incidents than it regresses. A cost win is at equal quality by
  // definition, so it only must not regress more than it improves; requiring a strict majority of
  // improvements made the cost path unreachable.
  const withinCap = regressions.length <= maxRegressions;
  const qualityRegressionsOk = withinCap && improvements.length > regressions.length;
  const costRegressionsOk = withinCap && improvements.length >= regressions.length;
  const regressionsOk = qualityWin ? qualityRegressionsOk : costRegressionsOk;
  const executionOk =
    candidate.executionSuccessRate >= incumbent.executionSuccessRate - maxExecutionDrop;

  const reasons: string[] = [];
  if (seeds.length === 0) reasons.push('no incident was scored on both lanes');
  if (!regressionsOk) {
    reasons.push(
      `${regressions.length} regressed incidents vs ${improvements.length} improved (cap ${maxRegressions})`
    );
  }
  if (!executionOk) {
    reasons.push(
      `execution success fell from ${incumbent.executionSuccessRate.toFixed(
        2
      )} to ${candidate.executionSuccessRate.toFixed(2)}`
    );
  }
  if (!qualityWin && !costWin) {
    reasons.push(
      `no accept path: reward CI (${ciLow.toFixed(3)}, ${ciHigh.toFixed(3)}) at ${costRatio.toFixed(
        2
      )}× cost; $/solved CI (${costPerSolvedCiLow.toFixed(3)}, ${costPerSolvedCiHigh.toFixed(3)})`
    );
  }

  const accepted =
    executionOk && ((qualityWin && qualityRegressionsOk) || (costWin && costRegressionsOk));
  return {
    accepted,
    confidence,
    acceptedVia: !accepted ? null : qualityWin && qualityRegressionsOk ? 'quality' : 'cost',
    seeds: seeds.length,
    meanDelta,
    ciLow,
    ciHigh,
    costPerSolvedDelta: candidateCostPerSolved - incumbentCostPerSolved,
    costPerSolvedCiLow,
    costPerSolvedCiHigh,
    incumbentCostPerSolved,
    candidateCostPerSolved,
    incumbentExecutionSuccess: incumbent.executionSuccessRate,
    candidateExecutionSuccess: candidate.executionSuccessRate,
    improvements,
    regressions,
    costRatio,
    reasons,
  };
};

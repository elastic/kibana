/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Crypto from 'crypto';
import Fs from 'fs';
import Path from 'path';
import { execFileSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';
import { harnessPaths } from './paths';
import type { TaskRun, TelemetryVariant } from './runner';

/**
 * Committed code the lane's Kibana runs an investigation with, besides the editable files (which
 * the variant hash covers). Git tree hashes, so a rebase that touches them invalidates the cache
 * and a harness-only commit does not.
 */
const LANE_RUNTIME_TREES = [
  'x-pack/solutions/observability/plugins/nightshift_investigations',
  'x-pack/platform/plugins/shared/agent_builder',
];

/** Harness-side code that turns an investigation into a score: the task runner and the judges. */
const SCORING_FILES = [
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/evals/investigation/task.ts',
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/evals/investigation/judges/index.ts',
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/evals/investigation/judges/prompts.ts',
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/evals/investigation/judges/orca_scoring.ts',
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/evals/investigation/judges/scoring.ts',
];

/**
 * Bump when the harness changes what a stored run means (reward formula, TaskRun fields), so
 * older entries stop matching. Harness changes that do not are free to land without it.
 */
const CACHE_VERSION = 1;

const sha = (value: string): string => Crypto.createHash('sha256').update(value).digest('hex');

const runtimeHash = (worktree: string): string =>
  sha(
    LANE_RUNTIME_TREES.map((tree) =>
      execFileSync('git', ['rev-parse', `HEAD:${tree}`], { cwd: worktree, encoding: 'utf8' }).trim()
    ).join(',')
  );

const scoringHash = (): string =>
  sha(SCORING_FILES.map((file) => Fs.readFileSync(Path.join(REPO_ROOT, file), 'utf8')).join('\0'));

export interface RunCacheKeyParts {
  /** `orca` or `customer0`: which dataset and scorer the run belongs to. */
  kind: 'orca' | 'customer0';
  variantHash: string;
  worktree: string;
  agentConnectorId: string;
  judgeConnectorId: string;
  telemetryVariant: TelemetryVariant;
}

/**
 * Stored rollouts keyed by everything that determines a run's outcome distribution: the task, the
 * variant's editable files, the lane's committed runtime code, the agent and judge models, the
 * telemetry variant, and the scoring code. Equal keys are samples of the same distribution, so a
 * stored rollout is as good as a fresh one.
 */
export const createRunCache = (parts: RunCacheKeyParts) => {
  const base = sha(
    JSON.stringify({
      version: CACHE_VERSION,
      kind: parts.kind,
      variant: parts.variantHash,
      runtime: runtimeHash(parts.worktree),
      scoring: scoringHash(),
      agent: parts.agentConnectorId,
      judge: parts.judgeConnectorId,
      telemetry: parts.telemetryVariant,
    })
  ).slice(0, 16);
  const dir = (taskId: string) =>
    Path.join(harnessPaths().root, 'cache', base, sha(taskId).slice(0, 16));
  const file = (taskId: string, rollout: number) => Path.join(dir(taskId), `r${rollout}.json`);

  return {
    key: base,
    get: (taskId: string, rollout: number): { run: TaskRun; trace: string } | undefined => {
      const path = file(taskId, rollout);
      if (!Fs.existsSync(path)) return undefined;
      return JSON.parse(Fs.readFileSync(path, 'utf8')) as { run: TaskRun; trace: string };
    },
    put: (taskId: string, run: TaskRun): void => {
      Fs.mkdirSync(dir(taskId), { recursive: true, mode: 0o700 });
      const trace = Fs.readFileSync(run.tracePath, 'utf8');
      Fs.writeFileSync(file(taskId, run.rollout), JSON.stringify({ run, trace }), { mode: 0o600 });
    },
  };
};

/**
 * Runs that say nothing about the variant: the harness or the infrastructure failed, not the
 * agent. They are never cached, so the next run measures them again. Everything else is, failures
 * included: re-running only failures would bias a variant's sample toward success.
 */
export const isInfrastructureFailure = (run: TaskRun & { judgeError?: boolean }): boolean =>
  Boolean(run.judgeError) ||
  /fetch failed|ECONNREFUSED|ECONNRESET|socket hang up|HTTP 5\d\d|outlived its timeout|CONNECT tunnel failed/i.test(
    run.executionError ?? ''
  );

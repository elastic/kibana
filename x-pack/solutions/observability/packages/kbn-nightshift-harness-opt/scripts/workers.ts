/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { OrcaTask } from './dataset';
import type { LaneSettings } from './paths';
import { laneAuth, restartCommandFor } from './paths';
import { prepareLane } from './kibana';
import { runOrcaWorkOnLane, summarize } from './runner';
import type { RunSummary, TaskRun, TelemetryVariant, WorkItem } from './runner';
import { runHoldoutWorkOnLane } from './holdout';
import { createRunCache, isInfrastructureFailure } from './cache';
import {
  resetWorkspace,
  restartLane,
  treeHash,
  variantHashOf,
  writeEdits,
} from './candidate_workspace';
import type { CodeEdit } from './candidate_workspace';

/** One version of the editable files: the edits on top of the workers' commit. */
export interface Variant {
  hash: string;
  edits: CodeEdit[];
  diff: string;
}

export const variantOf = (
  workers: LaneSettings[],
  edits: CodeEdit[],
  diff: string = ''
): Variant => ({ hash: variantHashOf(workers[0].worktree, edits), edits, diff });

/**
 * Longest-processing-time assignment of groups (cutoffs) to workers. A worker runs its groups one
 * after another and a group of up to \`concurrency\` runs takes one investigation's wall clock, so a
 * group costs \`ceil(size / concurrency)\` phases; the busiest worker sets the wall clock. Ties go to
 * the worker with fewer runs.
 */
export const assignGroups = <T>(
  groups: Map<string, T[]>,
  workerCount: number,
  concurrency: number = 16
): Array<Map<string, T[]>> => {
  const assigned = Array.from({ length: workerCount }, () => new Map<string, T[]>());
  const phases = new Array<number>(workerCount).fill(0);
  const runs = new Array<number>(workerCount).fill(0);
  const cost = (items: T[]) => Math.ceil(items.length / concurrency);
  for (const [key, items] of [...groups.entries()].sort(
    (a, b) => cost(b[1]) - cost(a[1]) || b[1].length - a[1].length
  )) {
    let target = 0;
    for (let i = 1; i < workerCount; i++) {
      if (phases[i] < phases[target] || (phases[i] === phases[target] && runs[i] < runs[target])) {
        target = i;
      }
    }
    assigned[target].set(key, items);
    phases[target] += cost(items);
    runs[target] += items.length;
  }
  return assigned;
};

/**
 * What a worker's Kibana was started with, for the next harness process: the variant hash and the
 * Kibana pid it was started as. Trusted only while that pid lives and the files still hash to it.
 */
const markerPath = (worker: LaneSettings) =>
  Path.join(worker.worktree, '.dev-stack', 'harness-variant.json');
const kibanaPid = (worker: LaneSettings): string | undefined => {
  const path = Path.join(worker.worktree, '.dev-stack', 'kibana.pid');
  return Fs.existsSync(path) ? Fs.readFileSync(path, 'utf8').trim() : undefined;
};
const pidAlive = (pid: string | undefined): boolean => {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (e) {
    return false;
  }
};
const writeMarker = (worker: LaneSettings, hash: string): void => {
  Fs.writeFileSync(markerPath(worker), JSON.stringify({ hash, kibanaPid: kibanaPid(worker) }));
};
const clearMarker = (worker: LaneSettings): void => {
  Fs.rmSync(markerPath(worker), { force: true });
};
const markerSays = async (worker: LaneSettings, hash: string): Promise<boolean> => {
  if (!Fs.existsSync(markerPath(worker))) return false;
  const marker = JSON.parse(Fs.readFileSync(markerPath(worker), 'utf8')) as {
    hash?: string;
    kibanaPid?: string;
  };
  if (marker.hash !== hash || treeHash(worker.worktree) !== hash) return false;
  if (!marker.kibanaPid || marker.kibanaPid !== kibanaPid(worker) || !pidAlive(marker.kibanaPid)) {
    return false;
  }
  try {
    const response = await fetch(`${worker.kibanaUrl}/api/status`, {
      headers: { Authorization: `Basic ${Buffer.from(laneAuth(worker)).toString('base64')}` },
    });
    const body = (await response.json()) as { status?: { overall?: { level?: string } } };
    return body.status?.overall?.level === 'available';
  } catch (e) {
    return false;
  }
};

/** Re-runs of infrastructure-broken runs per measurement, and the share still broken it accepts. */
const INFRA_RETRIES = 2;
const MAX_BROKEN_SHARE = 0.05;

/** A measurement the infrastructure spoiled; its numbers must not reach a gate. */
export class InfrastructureError extends Error {}

const settleAll = async <T>(promises: Array<Promise<T>>): Promise<T[]> => {
  const results = await Promise.allSettled(promises);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) throw (failed as PromiseRejectedResult).reason;
  return results.map((result) => (result as PromiseFulfilledResult<T>).value);
};

export interface MeasureOptions {
  label: string;
  variant: Variant;
  outputDir: string;
}

/**
 * The worker pool. One variant at a time runs on it: `measure` takes the variant's stored
 * rollouts from the run cache, writes the variant into the workers that get the rest, restarts
 * those whose files changed, and spreads the remaining cutoffs across them.
 */
export const createWorkerPool = ({
  workers,
  concurrency = 16,
  agentConnectorId,
  judgeConnectorId,
  telemetryVariant,
  log,
}: {
  workers: LaneSettings[];
  concurrency?: number;
  agentConnectorId: string;
  judgeConnectorId: string;
  telemetryVariant: TelemetryVariant;
  log: ToolingLog;
}) => {
  // What each worker's Kibana was started with, by this process. Unknown at first: a worker left
  // by an earlier process is restarted once rather than trusted.
  const running = new Map<string, string>();
  let busy = false;

  const exclusive = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (busy) throw new Error('the worker pool already has a measurement in flight');
    busy = true;
    try {
      return await fn();
    } finally {
      busy = false;
    }
  };

  const activate = async (variant: Variant, targets: LaneSettings[]): Promise<void> => {
    await settleAll(
      targets.map(async (worker) => {
        if (running.get(worker.lane) === variant.hash) return;
        if (await markerSays(worker, variant.hash)) {
          log.info(`[${worker.lane}] already running ${variant.hash}`);
          running.set(worker.lane, variant.hash);
          return;
        }
        running.delete(worker.lane);
        clearMarker(worker);
        await resetWorkspace({ path: worker.worktree });
        writeEdits({ edits: variant.edits, worktree: worker.worktree });
        const onDisk = treeHash(worker.worktree);
        if (onDisk !== variant.hash) {
          throw new Error(`${worker.lane} holds ${onDisk} after writing variant ${variant.hash}`);
        }
        const restarted = await restartLane({
          command: restartCommandFor(worker),
          url: worker.kibanaUrl,
          auth: laneAuth(worker),
          log,
        });
        if (!restarted) throw new Error(`${worker.lane} did not restart`);
        await prepareLane({ lane: worker, agentConnectorId, log });
        writeMarker(worker, variant.hash);
        running.set(worker.lane, variant.hash);
      })
    );
  };

  const cacheFor = (kind: 'orca' | 'customer0', variant: Variant) =>
    createRunCache({
      kind,
      variantHash: variant.hash,
      worktree: workers[0].worktree,
      agentConnectorId,
      judgeConnectorId,
      telemetryVariant: kind === 'orca' ? telemetryVariant : 'full',
    });

  /** ORCA tasks × rollouts for one variant; cached rollouts are reused, the rest run. */
  const measure = ({
    label,
    variant,
    outputDir,
    tasks,
    rollouts,
  }: MeasureOptions & { tasks: OrcaTask[]; rollouts: number }): Promise<RunSummary> =>
    exclusive(async () => {
      const traceDir = Path.join(outputDir, label, 'traces');
      Fs.mkdirSync(traceDir, { recursive: true });
      const cache = cacheFor('orca', variant);
      const cached: TaskRun[] = [];
      const work: WorkItem[] = [];
      for (const task of tasks) {
        for (let rollout = 0; rollout < rollouts; rollout++) {
          const hit = cache.get(task.id, rollout);
          if (!hit) {
            work.push({ task, rollout });
            continue;
          }
          const tracePath = Path.join(traceDir, `${task.caseId}-r${rollout}.json`);
          Fs.writeFileSync(tracePath, hit.trace);
          cached.push({ ...hit.run, tracePath, cached: true });
        }
      }
      const byCutoff = new Map<string, WorkItem[]>();
      for (const item of work) {
        byCutoff.set(item.task.cutoff, [...(byCutoff.get(item.task.cutoff) ?? []), item]);
      }
      const shards = assignGroups(byCutoff, workers.length, concurrency);
      log.info(
        `[harness-opt] "${label}" (variant ${variant.hash}, ${telemetryVariant}): ${
          tasks.length
        } tasks × ${rollouts} = ${tasks.length * rollouts} runs, ${cached.length} cached (key ${
          cache.key
        }), ${work.length} to run over ${byCutoff.size} cutoffs on ${
          shards.filter((shard) => shard.size > 0).length
        } worker(s): ${shards
          .map((shard, i) => `${workers[i].lane} ${[...shard.values()].flat().length}`)
          .join(', ')}`
      );
      const busyWorkers = workers.filter((worker, i) => shards[i].size > 0);
      await activate(variant, busyWorkers);

      const fresh = (
        await settleAll(
          workers.map(async (worker, i) => {
            const runOn = (items: WorkItem[]) =>
              runOrcaWorkOnLane({
                label,
                lane: worker,
                work: items,
                concurrency,
                agentConnectorId,
                judgeConnectorId,
                telemetryVariant,
                traceDir,
                log,
              });
            const items = [...shards[i].values()].flat();
            const runs = await runOn(items);
            // A run the infrastructure broke (sandbox down, judge error) says nothing about the
            // variant: run it again, a bounded number of times.
            for (let retry = 1; retry <= INFRA_RETRIES; retry++) {
              const broken = runs.filter(isInfrastructureFailure);
              if (broken.length === 0) break;
              log.warning(
                `[${label}] ${worker.lane}: ${broken.length} run(s) broken by infrastructure, retry ${retry}/${INFRA_RETRIES}`
              );
              const again = await runOn(
                items.filter(({ task, rollout }) =>
                  broken.some((run) => run.exampleId === task.id && run.rollout === rollout)
                )
              );
              for (const run of again) {
                const at = runs.findIndex(
                  (prior) => prior.exampleId === run.exampleId && prior.rollout === run.rollout
                );
                runs[at] = run;
              }
            }
            // Cached as soon as a worker is done, so a later worker's failure loses nothing.
            for (const run of runs) {
              if (!isInfrastructureFailure(run)) cache.put(run.exampleId, run);
            }
            return runs;
          })
        )
      ).flat();
      const broken = fresh.filter(isInfrastructureFailure);
      if (broken.length > MAX_BROKEN_SHARE * (cached.length + fresh.length)) {
        throw new InfrastructureError(
          `"${label}": ${broken.length} of ${
            cached.length + fresh.length
          } runs still broken by infrastructure after ${INFRA_RETRIES} retries (sandbox errors in ${
            broken.filter((run) => (run.sandboxErrors ?? 0) > 0).length
          })`
        );
      }

      return summarize({
        label,
        variant,
        telemetryVariant,
        agentConnectorId,
        runs: [...cached, ...fresh],
        outputDir,
        log,
      });
    });

  /** customer0 holdout tasks (one run each) for one variant, spread over the workers. */
  const measureHoldout = ({
    label,
    variant,
    outputDir,
    tasks,
  }: MeasureOptions & { tasks: OrcaTask[] }): Promise<RunSummary> =>
    exclusive(async () => {
      const traceDir = Path.join(outputDir, label, 'traces');
      Fs.mkdirSync(traceDir, { recursive: true, mode: 0o700 });
      const cache = cacheFor('customer0', variant);
      const cached: TaskRun[] = [];
      const pending = tasks.filter((task) => {
        const hit = cache.get(task.id, 0);
        if (!hit) return true;
        const tracePath = Path.join(traceDir, `${task.caseId}.json`);
        Fs.writeFileSync(tracePath, hit.trace, { mode: 0o600 });
        cached.push({ ...hit.run, tracePath, cached: true });
        return false;
      });
      const shards = workers.map((worker, i) =>
        pending.filter((task, j) => j % workers.length === i)
      );
      log.info(
        `[holdout] "${label}" (variant ${variant.hash}): ${tasks.length} customer0 incidents, ${cached.length} cached, ${pending.length} to run`
      );
      await activate(
        variant,
        workers.filter((worker, i) => shards[i].length > 0)
      );
      const fresh = (
        await settleAll(
          workers.map(async (worker, i) => {
            const runs = await runHoldoutWorkOnLane({
              label,
              lane: worker,
              tasks: shards[i],
              concurrency,
              agentConnectorId,
              judgeConnectorId,
              traceDir,
              log,
            });
            for (const run of runs) {
              if (!isInfrastructureFailure(run)) cache.put(run.exampleId, run);
            }
            return runs;
          })
        )
      ).flat();
      return summarize({
        label,
        variant,
        telemetryVariant: 'full',
        agentConnectorId,
        runs: [...cached, ...fresh],
        outputDir,
        log,
      });
    });

  /** Restarts every worker on `variant` (or leaves it if it already runs it). */
  const ensure = (variant: Variant) => exclusive(() => activate(variant, workers));

  return { workers, measure, measureHoldout, ensure };
};

export type WorkerPool = ReturnType<typeof createWorkerPool>;

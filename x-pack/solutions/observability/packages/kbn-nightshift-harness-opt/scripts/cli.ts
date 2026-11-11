/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import {
  describeSplits,
  ensureCustomer0Holdout,
  ensureDataset,
  loadCustomer0Tasks,
  tasksForSplit,
} from './dataset';
import { holdoutDir } from './holdout';
import type { Split } from './dataset';
import { defaultWorkers, harnessPaths } from './paths';
import { exportOrcaUserForSuite, readOrcaUser } from './secrets';
import type { RunSummary, TelemetryVariant } from './runner';
import { dryRound, loadIncumbent, runCampaign } from './campaign';
import { createWorkerPool, variantOf } from './workers';
import { serveReport, writeReport } from './report';
import { rescoreTraces } from './rescore';

/** Haiku: about 20× cheaper than Sonnet per investigation, so gates can afford rollouts. */
const DEFAULT_AGENT = '.anthropic-claude-5.5-haiku-chat_completion';
/** ORCA's judges bind to GPT-5.4 in the suite; same model here. */
const DEFAULT_JUDGE = '.openai-gpt-5.4-chat_completion';

const asSplit = (value: unknown): Split => {
  if (value === 'search' || value === 'gate' || value === 'sealed') return value;
  throw createFlagError(`--split must be search, gate, sealed or customer0 (got ${String(value)})`);
};
const asVariant = (value: unknown): TelemetryVariant => {
  // Default no-flags: with flag telemetry visible every investigation reads the fault switches
  // directly (71/71 incidents queried flagd), so the benchmark measured a lookup, not RCA.
  if (str(value) === undefined || value === 'no-flags') return 'no-flags';
  if (value === 'full') return 'full';
  throw createFlagError(`--telemetry must be full or no-flags (got ${String(value)})`);
};
/** dev-cli-runner defaults unset string flags to '', which must read as "not given". */
const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
const asNumber = (value: unknown, fallback?: number): number | undefined => {
  const given = str(value);
  if (given === undefined) return fallback;
  const parsed = Number(given);
  if (!Number.isFinite(parsed)) throw createFlagError(`expected a number, got "${given}"`);
  return parsed;
};

export const cli = () =>
  run(
    async ({ flags, log }) => {
      const [command] = flags._;
      // Turn termination into a normal exit, so sub-agent process groups are killed with us.
      for (const signal of ['SIGTERM', 'SIGINT'] as const) {
        process.once(signal, () => process.exit(130));
      }
      await ensureDataset();
      await ensureCustomer0Holdout();
      const agentConnectorId = str(flags.agent) ?? DEFAULT_AGENT;
      const judgeConnectorId = str(flags.judge) ?? DEFAULT_JUDGE;
      const telemetryVariant = asVariant(flags.telemetry);
      const pool = createWorkerPool({
        workers: defaultWorkers(),
        // 8 per worker: 4 workers at 16 each coincided with a sandbox-api outage (ECONNREFUSED).
        concurrency: asNumber(flags.concurrency, 8) ?? 8,
        agentConnectorId,
        judgeConnectorId,
        telemetryVariant,
        log,
      });
      // `--base` measures the unedited files instead of the stored incumbent.
      const variant = () => (flags.base ? variantOf(pool.workers, [], '') : loadIncumbent(pool));

      switch (command) {
        case 'splits': {
          log.info(`\n${describeSplits()}`);
          const split = str(flags.split) ? asSplit(flags.split) : undefined;
          if (split) {
            for (const task of tasksForSplit(split, { limit: asNumber(flags.limit) })) {
              log.info(`${task.caseId}  ${task.incident}  cutoff ${task.cutoff}`);
            }
          }
          return;
        }
        case 'prepare':
        case 'restart': {
          // Writes the incumbent (or --base) into every worker and restarts those not running it.
          await pool.ensure(variant());
          return;
        }
        case 'run': {
          exportOrcaUserForSuite(readOrcaUser());
          const cases = str(flags.case)?.split(',');
          const outputDir = Path.join(
            str(flags.split) === 'customer0' ? holdoutDir() : harnessPaths().runsDir,
            `run-${Date.now()}`
          );
          if (str(flags.split) === 'customer0') {
            const holdoutTasks = loadCustomer0Tasks().filter(
              ({ caseId }) => !cases || cases.includes(caseId)
            );
            const limited = cases
              ? holdoutTasks
              : holdoutTasks.slice(0, asNumber(flags.limit) ?? holdoutTasks.length);
            if (limited.length === 0) throw createFlagError('no customer0 tasks selected');
            await pool.measureHoldout({
              label: 'customer0',
              variant: variant(),
              tasks: limited,
              outputDir,
            });
            log.info(`[harness-opt] output: ${outputDir}`);
            return;
          }
          const split = asSplit(str(flags.split) ?? 'search');
          const tasks = cases
            ? tasksForSplit(split).filter(({ caseId }) => cases.includes(caseId))
            : tasksForSplit(split, { limit: asNumber(flags.limit) });
          if (tasks.length === 0) throw createFlagError('no tasks selected');
          await pool.measure({
            label: split,
            variant: variant(),
            tasks,
            rollouts: asNumber(flags.rollouts, 1) ?? 1,
            outputDir,
          });
          log.info(`[harness-opt] output: ${outputDir}`);
          return;
        }
        case 'dry-round': {
          // Propose → review → validate on an existing measurement, without measuring anything.
          const from = str(flags.from);
          if (!from) throw createFlagError('--from <run summary json> is required');
          const { runs, summary } = JSON.parse(Fs.readFileSync(from, 'utf8')) as {
            runs: RunSummary['runs'];
            summary: Omit<RunSummary, 'runs'>;
          };
          await dryRound({ summary: { ...summary, runs }, pool, log });
          return;
        }
        case 'rescore': {
          // Re-judge stored investigations: `--traces a.json,b.json` or every trace under `--from`.
          const from = str(flags.from);
          const traces = str(flags.traces)?.split(',') ?? [];
          const tracePaths = from
            ? Fs.readdirSync(from, { recursive: true })
                .map(String)
                .filter((file) => file.includes('traces/') && file.endsWith('.json'))
                .map((file) => Path.join(from, file))
            : traces;
          if (tracePaths.length === 0) throw createFlagError('--from <dir> or --traces <files>');
          await rescoreTraces({ tracePaths, lane: pool.workers[0], judgeConnectorId, log });
          return;
        }
        case 'report': {
          const ledgerFile = str(flags.ledger);
          if (flags.serve) {
            await serveReport({
              host: str(flags.host) ?? '0.0.0.0',
              port: asNumber(flags.port, 7712) ?? 7712,
              ledgerFile,
              log,
            });
            return;
          }
          log.info(`[harness-opt] report: ${writeReport(ledgerFile)}`);
          return;
        }
        case 'campaign': {
          exportOrcaUserForSuite(readOrcaUser());
          await runCampaign({
            rounds: asNumber(flags.rounds, 1) ?? 1,
            searchRollouts: asNumber(flags['search-rollouts'], 1) ?? 1,
            gateRollouts: asNumber(flags['gate-rollouts'], 5) ?? 5,
            gateConfidence: asNumber(flags['gate-confidence']),
            searchTasks: tasksForSplit('search', { limit: asNumber(flags['search-limit']) }),
            gateTasks: tasksForSplit('gate', { limit: asNumber(flags['gate-limit']) }),
            pool,
            agentConnectorId,
            candidateSearch: Boolean(flags['candidate-search']),
            acceptAny: Boolean(flags['accept-any']),
            holdoutTasks: flags['skip-holdout']
              ? []
              : loadCustomer0Tasks({ limit: asNumber(flags['holdout-limit']) }),
            holdoutAlways: Boolean(flags['holdout-always']),
            log,
          });
          return;
        }
        default:
          throw createFlagError(`unknown command "${String(command)}"`);
      }
    },
    {
      description: `Nightshift investigation harness optimization loop (elastic/nightshift-program#2298).

Every measurement runs on the worker pool (NIGHTSHIFT_HARNESS_WORKERS, default w1:3,w2:5,w3:6,w4:7)
and is served from the run cache where it can. Measurements use the stored incumbent, or the
unedited files with --base.

  splits [--split search --limit 4]     print the incident splits / a selection
  restart | prepare [--base]            put the incumbent on every worker
  run --split search|gate|sealed|customer0 [--limit N] [--case <id,...>] [--rollouts N] [--base]
  dry-round --from <runs/.../label.json>  propose, review and validate only
  report [--serve --port 7712] [--ledger ledger.json]   HTML report of runs and rounds
  campaign --rounds 1 --search-limit 12 --gate-limit 12 --gate-rollouts 5
      [--gate-confidence 0.6] [--candidate-search] [--holdout-limit N] [--skip-holdout] [--holdout-always (debug)]`,
      flags: {
        string: [
          'split',
          'limit',
          'case',
          'rollouts',
          'concurrency',
          'agent',
          'judge',
          'telemetry',
          'rounds',
          'search-limit',
          'gate-limit',
          'search-rollouts',
          'gate-rollouts',
          'from',
          'ledger',
          'traces',
          'host',
          'port',
          'holdout-limit',
          'gate-confidence',
        ],
        boolean: [
          'candidate-search',
          'accept-any',
          'serve',
          'skip-holdout',
          'holdout-always',
          'base',
        ],
      },
    }
  );

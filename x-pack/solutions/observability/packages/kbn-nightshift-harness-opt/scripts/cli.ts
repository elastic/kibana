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
import { describeSplits, ensureDataset, tasksForSplit } from './dataset';
import type { Split } from './dataset';
import { defaultLanes, harnessPaths, laneAuth, restartCommandFor } from './paths';
import type { Lane } from './paths';
import { exportOrcaUserForSuite, readOrcaUser } from './secrets';
import { prepareLane } from './kibana';
import { runVariant } from './runner';
import type { RunSummary, TelemetryVariant } from './runner';
import { restartLane, treeHash } from './candidate_workspace';
import { dryRound, runCampaign } from './campaign';
import { serveReport, writeReport } from './report';
import { rescoreTraces } from './rescore';

const DEFAULT_AGENT = '.anthropic-claude-5.5-sonnet-chat_completion';
/** ORCA's judges bind to GPT-5.4 in the suite; same model here. */
const DEFAULT_JUDGE = '.openai-gpt-5.4-chat_completion';

const asSplit = (value: unknown): Split => {
  if (value === 'search' || value === 'gate' || value === 'sealed') return value;
  throw createFlagError(`--split must be search, gate or sealed (got ${String(value)})`);
};
const asLane = (value: unknown): Lane => {
  if (value === 'incumbent' || value === 'candidate') return value;
  throw createFlagError(`--lane must be incumbent or candidate (got ${String(value)})`);
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
      const lanes = defaultLanes();
      const agentConnectorId = str(flags.agent) ?? DEFAULT_AGENT;
      const judgeConnectorId = str(flags.judge) ?? DEFAULT_JUDGE;
      const telemetryVariant = asVariant(flags.telemetry);

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
        case 'prepare': {
          const lane = lanes[asLane(str(flags.lane) ?? 'incumbent')];
          await prepareLane({ lane, agentConnectorId, log });
          return;
        }
        case 'restart': {
          const lane = lanes[asLane(str(flags.lane) ?? 'incumbent')];
          const restartCommand = restartCommandFor(lane);
          log.info(restartCommand);
          if (
            !(await restartLane({
              command: restartCommand,
              url: lane.kibanaUrl,
              auth: laneAuth(lane),
              log,
            }))
          ) {
            throw new Error(`${lane.lane} did not restart`);
          }
          await prepareLane({ lane, agentConnectorId, log });
          return;
        }
        case 'run': {
          exportOrcaUserForSuite(readOrcaUser());
          const lane = lanes[asLane(str(flags.lane) ?? 'incumbent')];
          const split = asSplit(str(flags.split) ?? 'search');
          const cases = str(flags.case)?.split(',');
          const tasks = cases
            ? tasksForSplit(split).filter(({ caseId }) => cases.includes(caseId))
            : tasksForSplit(split, { limit: asNumber(flags.limit) });
          if (tasks.length === 0) throw createFlagError('no tasks selected');
          await prepareLane({ lane, agentConnectorId, log });
          const outputDir = Path.join(harnessPaths().runsDir, `run-${Date.now()}`);
          await runVariant({
            label: `${lane.lane}-${split}`,
            variant: { hash: treeHash(lane.worktree) },
            lane,
            tasks,
            rollouts: asNumber(flags.rollouts, 1) ?? 1,
            concurrency: asNumber(flags.concurrency, 8),
            agentConnectorId,
            judgeConnectorId,
            telemetryVariant,
            outputDir,
            log,
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
          await dryRound({ summary: { ...summary, runs }, lanes, log });
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
          await rescoreTraces({
            tracePaths,
            lane: lanes[asLane(str(flags.lane) ?? 'incumbent')],
            judgeConnectorId,
            log,
          });
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
            gateRollouts: asNumber(flags['gate-rollouts'], 2) ?? 2,
            concurrency: asNumber(flags.concurrency, 8) ?? 8,
            searchTasks: tasksForSplit('search', { limit: asNumber(flags['search-limit']) }),
            gateTasks: tasksForSplit('gate', { limit: asNumber(flags['gate-limit']) }),
            lanes,
            agentConnectorId,
            judgeConnectorId,
            telemetryVariant,
            skipCandidateSearch: Boolean(flags['skip-candidate-search']),
            acceptAny: Boolean(flags['accept-any']),
            freshSearch: Boolean(flags['fresh-search']),
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

  splits [--split search --limit 4]     print the incident splits / a selection
  prepare --lane incumbent              set up a lane's space for ORCA runs
  run --lane incumbent --split search --limit 2 [--case <id,...>]
  dry-round --from <runs/.../label.json>  propose, review and validate only
  report [--serve --port 7712] [--ledger ledger.json]   HTML report of runs and rounds
  campaign --rounds 1 --search-limit 3 --gate-limit 3 --gate-rollouts 1`,
      flags: {
        string: [
          'lane',
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
        ],
        boolean: ['skip-candidate-search', 'accept-any', 'fresh-search', 'serve'],
      },
    }
  );

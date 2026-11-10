/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFile } from 'child_process';
import Fs from 'fs';
import Http from 'http';
import Path from 'path';
import { promisify } from 'util';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { harnessPaths } from './paths';
import { reportTemplate } from './report_template';
import type { RunSummary, TaskRun } from './runner';
import type { GateResult } from './gate';
import { assignSplits, loadTasks } from './dataset';

interface StoredRun {
  summary: Omit<RunSummary, 'runs'>;
  variant?: { hash: string };
  runs: TaskRun[];
}

interface LedgerEntry {
  round: number;
  campaignId?: string;
  rejected?: string;
  manifest?: {
    files?: string[];
    rationale?: string;
    predictedFixes?: string[];
    predictedRegressions?: string[];
  };
  review?: { verdict: string; reasons: string[]; unavailable?: boolean };
  gate?: GateResult;
  failures?: string[];
  error?: string;
  filesChanged?: string[];
  diff?: string;
  parentHash?: string;
  variantHash?: string;
  predictionCheck?: string;
  forcedPromotion?: boolean;
  telemetryVariant?: string;
  agentConnectorId?: string;
  outputDir?: string;
}

const readJson = <T>(path: string): T | undefined => {
  try {
    return JSON.parse(Fs.readFileSync(path, 'utf8')) as T;
  } catch (e) {
    return undefined;
  }
};

/** Every `<runsDir>/<group>/<label>.json`, oldest first. */
const loadRuns = (runsDir: string) => {
  if (!Fs.existsSync(runsDir)) return [];
  const loaded: Array<{
    id: string;
    group: string;
    label: string;
    stored: StoredRun;
    mtimeMs: number;
  }> = [];
  for (const group of Fs.readdirSync(runsDir)) {
    const groupDir = Path.join(runsDir, group);
    if (!Fs.statSync(groupDir).isDirectory()) continue;
    for (const file of Fs.readdirSync(groupDir)) {
      if (!file.endsWith('.json')) continue;
      const stored = readJson<StoredRun>(Path.join(groupDir, file));
      if (!stored?.summary) continue;
      loaded.push({
        id: `${group}/${file.replace(/\.json$/, '')}`,
        group,
        label: file.replace(/\.json$/, ''),
        stored,
        mtimeMs: Fs.statSync(Path.join(groupDir, file)).mtimeMs,
      });
    }
  }
  return loaded.sort((a, b) => a.mtimeMs - b.mtimeMs);
};

/** What the UI shows per run; the trajectory stays on disk and is fetched on demand. */
const resultView = (run: TaskRun) => {
  const trace = readJson<{
    report?: { conclusion?: string; summary?: string };
    judge_explanations?: Record<string, string>;
  }>(run.tracePath);
  return {
    caseId: run.caseId,
    incident: run.seedId,
    control: run.control,
    tier: run.tier,
    rollout: run.rollout,
    question: run.question,
    plausibleFlags: run.plausibleFlags,
    namedFlags: run.namedFlags ?? [],
    reward: run.reward,
    rcaAccuracy: run.rcaAccuracy,
    hallucination: run.hallucination,
    control_score: run.control_score,
    executionSuccess: run.executionSuccess,
    executionError: run.executionError,
    toolCalls: run.toolCalls,
    costUsd: run.costUsd,
    latencyMs: run.latencyMs,
    investigationId: run.investigationId,
    tracePath: run.tracePath,
    conclusion: (trace?.report?.conclusion ?? run.conclusion ?? '').slice(0, 6000),
    judge: trace?.judge_explanations?.orca_rca_accuracy ?? trace?.judge_explanations?.orca_control,
  };
};

const meanOf = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/**
 * Everything the UI needs: lineage, per-round diffs with per-case effects on both lanes, a run
 * browser and per-case history. Derived from the run files and the ledger alone, so the report is
 * reproducible from `~/.nightshift-harness` and re-rendering is a pure function of what is on disk.
 */
export const buildReportPayload = (ledgerFile = 'ledger.json') => {
  const { runsDir, lineageDir } = harnessPaths();
  const runs = loadRuns(runsDir);
  const ledger = readJson<LedgerEntry[]>(Path.join(lineageDir, ledgerFile)) ?? [];

  const runViews = runs.map(({ id, group, label, stored }) => ({
    id,
    group,
    label,
    configHash: stored.summary.configHash,
    telemetryVariant: stored.summary.telemetryVariant,
    agentConnectorId: stored.summary.agentConnectorId,
    meanReward: stored.summary.meanReward,
    scoredRuns: stored.summary.scoredRuns,
    executionSuccessRate: stored.summary.executionSuccessRate,
    meanRcaAccuracy: stored.summary.meanRcaAccuracy,
    meanHallucination: stored.summary.meanHallucination,
    meanControl: stored.summary.meanControl,
    totalCostUsd: stored.summary.totalCostUsd,
    meanToolCalls: stored.summary.meanToolCalls,
    results: (stored.runs ?? []).map(resultView),
  }));
  const byId = new Map(runViews.map((run) => [run.id, run]));
  const runFor = (entry: LedgerEntry, suffix: string) =>
    entry.outputDir
      ? byId.get(`${Path.basename(entry.outputDir)}/round${entry.round}-${suffix}`)
      : undefined;

  let runningVariant = ledger.find((entry) => entry.parentHash)?.parentHash ?? 'base';
  const rounds = ledger.map((entry) => {
    const parentHash = entry.parentHash ?? runningVariant;
    const promoted = Boolean(entry.gate?.accepted || entry.forcedPromotion);
    if (promoted && entry.variantHash) runningVariant = entry.variantHash;

    const incumbentGate = runFor(entry, 'incumbent-gate');
    const candidateGate = runFor(entry, 'candidate-gate');
    // A reused search run lives in an earlier round's directory, so fall back to any search run
    // of this incumbent variant.
    const incumbentSearch =
      runFor(entry, 'incumbent-search') ??
      [...runViews]
        .reverse()
        .find((run) => run.label.endsWith('incumbent-search') && run.configHash === parentHash);
    const candidateSearch = runFor(entry, 'candidate-search');

    const pairCases = (
      before: (typeof runViews)[number] | undefined,
      after: (typeof runViews)[number] | undefined
    ) => {
      if (!before || !after) return [];
      return [...new Set(before.results.map((result) => result.caseId))].map((caseId) => {
        const left = before.results.filter((result) => result.caseId === caseId);
        const right = after.results.filter((result) => result.caseId === caseId);
        const rewardOf = (side: typeof left) =>
          meanOf(side.map((r) => r.reward).filter((r): r is number => r !== null));
        const incumbent = rewardOf(left);
        const candidate = rewardOf(right);
        return {
          caseId,
          incident: left[0]?.incident,
          control: left[0]?.control,
          tier: left[0]?.tier,
          question: left[0]?.question ?? '',
          plausibleFlags: left[0]?.plausibleFlags ?? [],
          incumbent,
          candidate,
          delta: incumbent !== null && candidate !== null ? candidate - incumbent : null,
          incumbentRuns: left,
          candidateRuns: right,
        };
      });
    };

    return {
      round: entry.round,
      campaignId: entry.campaignId ?? 'legacy',
      rejectedReason: entry.rejected,
      failures: entry.failures ?? (entry.error ? [entry.error] : []),
      parentHash,
      configHash: entry.variantHash ?? `round-${entry.round}`,
      promoted,
      forcedPromotion: entry.forcedPromotion ?? false,
      filesChanged: entry.filesChanged ?? [],
      diff: entry.diff ?? '',
      rationale: entry.manifest?.rationale ?? '',
      predictedFixes: entry.manifest?.predictedFixes ?? [],
      predictedRegressions: entry.manifest?.predictedRegressions ?? [],
      predictionCheck: entry.predictionCheck,
      review: entry.review,
      gate: entry.gate,
      telemetryVariant: entry.telemetryVariant,
      agentConnectorId: entry.agentConnectorId,
      gateCases: pairCases(incumbentGate, candidateGate),
      searchCases: pairCases(incumbentSearch, candidateSearch),
      runs: [incumbentSearch, incumbentGate, candidateGate, candidateSearch]
        .filter(Boolean)
        .map((run) => run?.id),
    };
  });

  // Per-case history across every run: the fastest way to tell "this case is hard" from "this
  // variant broke it".
  const splits = (() => {
    try {
      return assignSplits(loadTasks());
    } catch (e) {
      return new Map<string, string>();
    }
  })();
  const cases = new Map<
    string,
    {
      caseId: string;
      incident: string;
      split?: string;
      control: boolean;
      tier: string;
      question: string;
      plausibleFlags: string[];
      runs: number;
      scored: number;
      meanReward: number | null;
      history: Array<Record<string, unknown>>;
    }
  >();
  for (const run of runViews) {
    for (const result of run.results) {
      const current = cases.get(result.caseId) ?? {
        caseId: result.caseId,
        incident: result.incident,
        split: splits.get(result.incident),
        control: result.control,
        tier: result.tier,
        question: result.question,
        plausibleFlags: result.plausibleFlags,
        runs: 0,
        scored: 0,
        meanReward: null,
        history: [],
      };
      current.history.push({ runId: run.id, label: run.label, variant: run.configHash, ...result });
      current.runs += 1;
      if (result.reward !== null) {
        current.meanReward =
          ((current.meanReward ?? 0) * current.scored + result.reward) / (current.scored + 1);
        current.scored += 1;
      }
      cases.set(result.caseId, current);
    }
  }

  const splitSummary = (() => {
    try {
      const tasks = loadTasks();
      return (['search', 'gate', 'sealed'] as const).map((split) => {
        const inSplit = tasks.filter((task) => splits.get(task.incident) === split);
        return {
          split,
          incidents: [...new Set(inSplit.map((task) => task.incident))].sort(),
          tasks: inSplit.length,
          controls: inSplit.filter((task) => task.control).length,
        };
      });
    } catch (e) {
      return [];
    }
  })();

  return {
    generatedAt: new Date().toISOString(),
    ledgerFile,
    baseHash: rounds.length ? rounds[0].parentHash : 'base',
    rounds,
    runs: runViews,
    cases: [...cases.values()],
    caseCount: cases.size,
    splits: splitSummary,
    totalCostUsd: runViews.reduce((total, run) => total + run.totalCostUsd, 0),
  };
};

export const renderReport = (ledgerFile?: string): string =>
  reportTemplate(JSON.stringify(buildReportPayload(ledgerFile)).replace(/</g, '\\u003c'));

export const writeReport = (ledgerFile?: string): string => {
  const outputPath = Path.join(harnessPaths().root, 'report.html');
  Fs.writeFileSync(outputPath, renderReport(ledgerFile));
  return outputPath;
};

const execFileAsync = promisify(execFile);

/**
 * Serve the report, re-rendered per request in a child process so code and data edits show up on
 * reload, plus `/trace?path=` for a run's full trajectory (only files under the runs directory).
 */
export const serveReport = ({
  host,
  port,
  ledgerFile,
  log,
}: {
  host: string;
  port: number;
  ledgerFile?: string;
  log: ToolingLog;
}): Promise<void> =>
  new Promise((resolve, reject) => {
    const { runsDir, root } = harnessPaths();
    const server = Http.createServer((request, response) => {
      const url = new URL(request.url ?? '/', `http://${host}`);
      if (url.pathname === '/health') {
        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end('ok');
        return;
      }
      if (url.pathname === '/trace') {
        const requested = Path.resolve(url.searchParams.get('path') ?? '');
        if (!requested.startsWith(Path.resolve(runsDir) + Path.sep) || !Fs.existsSync(requested)) {
          response.writeHead(404, { 'content-type': 'text/plain' });
          response.end('not found');
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        response.end(Fs.readFileSync(requested));
        return;
      }
      void (async () => {
        try {
          await execFileAsync(
            process.execPath,
            [
              Path.join(REPO_ROOT, 'scripts/nightshift_harness_opt.js'),
              'report',
              ...(ledgerFile ? ['--ledger', ledgerFile] : []),
            ],
            { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 }
          );
          response.writeHead(200, {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
          });
          response.end(Fs.readFileSync(Path.join(root, 'report.html'), 'utf8'));
        } catch (e) {
          response.writeHead(500, { 'content-type': 'text/plain' });
          response.end(String((e as Error).message));
        }
      })();
    });
    server.on('error', reject);
    server.listen(port, host, () => {
      log.info(`[harness-opt] report on http://${host}:${port} — re-rendered per request`);
    });
    process.on('SIGINT', () => {
      server.close();
      resolve();
    });
  });

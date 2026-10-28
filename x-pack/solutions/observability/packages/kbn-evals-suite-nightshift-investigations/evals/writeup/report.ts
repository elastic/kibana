/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetRunResult } from '@kbn/evals';
import { knownNumbers, runReplyGates, type ReplyGates } from './gates';
import { replayCorpus } from './replay';
import type { PairTally } from './judges';
import {
  REPLY_FAITHFULNESS_EVALUATOR,
  REPLY_VS_BASELINE_EVALUATOR,
  REPLY_VS_GOLDEN_EVALUATOR,
} from './evaluators';
import {
  isLongReplyType,
  type ReplyType,
  type WriteupExample,
  type WriteupTaskOutput,
} from './types';

type TaskRun = DatasetRunResult['runs'][string];
type EvaluationRun = DatasetRunResult['evaluationRuns'][number];

/** One rewritten round and sample, flattened for the report and for judge agreement. */
export interface WriteupRow {
  case_id: string;
  round_index: number;
  reply_type: ReplyType;
  sample: number;
  question: string;
  reply: string | null;
  error?: string;
  extra_calls: string[];
  gates: ReplyGates | null;
  /** Faithfulness, 1–5. */
  faith: number | null;
  unsupported_claims: string[];
  vs_golden: PairTally | null;
  vs_baseline: PairTally | null;
  golden: string | null;
  /** Empty, with no gates, for a follow-up question production never answered. */
  recorded: { reply: string; gates: ReplyGates | null };
  baseline: { reply: string | null; gates: ReplyGates | null } | null;
}

export interface WriteupResults {
  dataset: string;
  model: string;
  judge: string;
  prompt: { label: string; hash: string };
  baseline?: { label: string; hash: string };
  votes: number;
  rows: WriteupRow[];
}

/**
 * Rows from an experiment's runs and evaluation results. Every repetition is one sample; the
 * recorded and baseline replies get the same deterministic gates, so each arm reads off one table.
 */
export const toWriteupRows = (
  runs: Record<string, TaskRun>,
  evaluationRuns: EvaluationRun[]
): WriteupRow[] =>
  Object.entries(runs)
    .map(([runId, run]) => {
      const output = run.output as WriteupTaskOutput;
      const input = run.input as WriteupExample['input'];
      const expected = run.expected as WriteupExample['output'];
      const known = knownNumbers(replayCorpus(input.rounds, input.round_index));
      const gates = (reply?: string | null) =>
        reply ? runReplyGates(reply, output.reply_type, known) : null;
      const result = (name: string) =>
        evaluationRuns.find((e) => e.experimentRunId === runId && e.name === name)?.result;
      const tally = (name: string) => {
        const metadata = result(name)?.metadata as Partial<PairTally> | undefined;
        return metadata && typeof metadata.win === 'number' ? (metadata as PairTally) : null;
      };
      const faith = result(REPLY_FAITHFULNESS_EVALUATOR)?.metadata as
        | { raw_score?: number; unsupported_claims?: string[] }
        | undefined;
      return {
        case_id: output.case_id,
        round_index: output.round_index,
        reply_type: output.reply_type,
        sample: run.repetition,
        question: output.question,
        reply: output.reply ?? null,
        ...(output.error ? { error: output.error } : {}),
        extra_calls: output.extra_calls,
        gates: gates(output.reply),
        faith: faith?.raw_score ?? null,
        unsupported_claims: faith?.unsupported_claims ?? [],
        vs_golden: tally(REPLY_VS_GOLDEN_EVALUATOR),
        vs_baseline: tally(REPLY_VS_BASELINE_EVALUATOR),
        golden: expected.golden ?? null,
        recorded: { reply: expected.recorded_reply, gates: gates(expected.recorded_reply) },
        baseline: output.baseline
          ? { reply: output.baseline.reply ?? null, gates: gates(output.baseline.reply) }
          : null,
      };
    })
    .sort((a, b) => a.case_id.localeCompare(b.case_id) || a.sample - b.sample);

/**
 * A candidate may replace its golden when every gate passes, faithfulness is at least 4, and it
 * wins at least five of every six golden comparisons. A person approves before a golden changes.
 */
export const ratchetCandidates = (rows: WriteupRow[], votes: number): WriteupRow[] => {
  const needed = Math.ceil((5 / 6) * votes * 2);
  return rows.filter(
    (r) => r.gates?.pass && (r.faith ?? 0) >= 4 && (r.vs_golden?.win ?? 0) >= needed
  );
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const fixed = (n: number, digits = 1) => (Number.isNaN(n) ? '-' : n.toFixed(digits));
const sumTallies = (ts: Array<PairTally | null>) =>
  ts.reduce<PairTally>(
    (acc, t) =>
      t
        ? {
            win: acc.win + t.win,
            loss: acc.loss + t.loss,
            tie: acc.tie + t.tie,
            failed: acc.failed + t.failed,
          }
        : acc,
    { win: 0, loss: 0, tie: 0, failed: 0 }
  );

interface ArmSummary {
  arm: string;
  replies: string;
  gates: string;
  words: string;
  lead: string;
  points: string;
  within20: string;
  faith: string;
  vsGolden: string;
}

const summarize = (
  arm: string,
  replies: Array<{ gates: ReplyGates | null }>,
  faith: Array<number | null>,
  vsGolden: Array<PairTally | null> | null
): ArmSummary => {
  const scored = replies.filter((r) => r.gates).map((r) => r.gates!);
  const m = (f: (g: ReplyGates) => number) => mean(scored.map(f));
  const f = faith.filter((x): x is number => typeof x === 'number');
  const g = vsGolden ? sumTallies(vsGolden) : null;
  return {
    arm,
    replies: `${scored.length}/${replies.length}`,
    gates: `${scored.filter((x) => x.pass).length}/${scored.length}`,
    words: fixed(
      m((x) => x.metrics.words),
      0
    ),
    lead: fixed(
      m((x) => x.metrics.leadWords),
      0
    ),
    points: fixed(m((x) => x.metrics.points)),
    within20: Number.isNaN(m((x) => x.metrics.within20))
      ? '-'
      : `${Math.round(m((x) => x.metrics.within20) * 100)}%`,
    faith: f.length ? fixed(mean(f), 2) : '-',
    vsGolden: g ? `${g.win}/${g.loss}/${g.tie}` : '-',
  };
};

/** The summary table and per-round detail as markdown. */
export const formatReport = (results: WriteupResults): { summary: string; report: string } => {
  const { rows, votes } = results;
  const arms: ArmSummary[] = [
    summarize(
      results.prompt.label,
      rows,
      rows.map((r) => r.faith),
      rows.map((r) => r.vs_golden)
    ),
    ...(results.baseline
      ? [
          summarize(
            results.baseline.label,
            rows.map((r) => ({ gates: r.baseline?.gates ?? null })),
            [],
            null
          ),
        ]
      : []),
    // The recorded reply is the same for every sample; count each round once. Added follow-ups
    // have none.
    summarize(
      'recorded',
      rows.filter((r) => r.sample === 0 && r.recorded.reply).map((r) => r.recorded),
      [],
      null
    ),
  ];
  const table = [
    '| Arm | Replies | Gates passed | Words avg | First sentence avg | Points avg | Sentences ≤20 | Faithfulness avg | vs golden W/L/T |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...arms.map(
      (a) =>
        `| ${a.arm} | ${a.replies} | ${a.gates} | ${a.words} | ${a.lead} | ${a.points} | ${a.within20} | ${a.faith} | ${a.vsGolden} |`
    ),
  ];
  if (results.baseline) {
    // Split by what the question asked for: a prompt can win short answers and lose requests for
    // more, and the total hides it.
    const h2h = (keep: (r: WriteupRow) => boolean) => {
      const t = sumTallies(rows.filter(keep).map((r) => r.vs_baseline));
      return `${t.win}–${t.loss} (${t.tie} ties)`;
    };
    table.push(
      '',
      `| ${results.prompt.label} vs ${results.baseline.label} | All | Short questions | Requests for more |`,
      '| --- | --- | --- | --- |',
      `| Head to head, wins–losses | ${h2h(() => true)} | ${h2h(
        (r) => !isLongReplyType(r.reply_type)
      )} | ${h2h((r) => isLongReplyType(r.reply_type))} |`
    );
  }
  const header = [
    `Model ${results.model}, judge ${results.judge}, dataset ${results.dataset}.`,
    `Prompt ${results.prompt.label} (${results.prompt.hash})${
      results.baseline ? `, baseline ${results.baseline.label} (${results.baseline.hash})` : ''
    }. Pairwise ${votes} vote(s) × 2 orders. "recorded" is the reply the conversation actually got.`,
  ];
  const summary = [...header, '', ...table].join('\n');

  const quote = (text: string) =>
    text
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n');
  const detail: string[] = ['## Per round', ''];
  for (const r of rows.filter((x) => x.sample === 0)) {
    detail.push(
      `### ${r.case_id} (${r.reply_type}): ${r.question.slice(0, 140).replace(/\n/g, ' ')}`,
      ''
    );
    const status = (g: ReplyGates | null, error?: string) => {
      if (!g) return error ?? '';
      const failed = g.failed.filter((f) => !/^\d+ words$/.test(f));
      return `${g.metrics.words} words, ${failed.length ? failed.join('; ') : 'other gates pass'}`;
    };
    detail.push(
      `**${results.prompt.label}**${
        r.extra_calls.length ? ` (after extra calls: ${r.extra_calls.join(', ')})` : ''
      } (${status(r.gates, r.error)}${r.faith ? `, faith ${r.faith}` : ''})`,
      '',
      quote(r.reply ?? ''),
      ''
    );
    if (r.baseline) {
      detail.push(
        `**${results.baseline!.label}** (${status(r.baseline.gates)})`,
        '',
        quote(r.baseline.reply ?? ''),
        ''
      );
    }
    if (r.recorded.reply) {
      detail.push(`**recorded** (${status(r.recorded.gates)})`, '', quote(r.recorded.reply), '');
    }
    if (r.golden) detail.push('**golden**', '', quote(r.golden), '');
    if (r.unsupported_claims.length) {
      detail.push('Unsupported claims:', ...r.unsupported_claims.map((c) => `- ${c}`), '');
    }
  }
  const ratchet = ratchetCandidates(rows, votes);
  detail.push(
    '## Ratchet: candidates that may replace their golden (needs approval)',
    '',
    ...(ratchet.length
      ? ratchet.map((r) => `- ${r.case_id}, sample ${r.sample}`)
      : ['None this run.']),
    ''
  );
  return { summary, report: [`# Writeup`, '', summary, '', ...detail].join('\n') };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { buildModelFromConnector, type EvalConnector } from '@kbn/evals';
import { knownNumbers, runReplyGates } from './gates';
import { comparePair, judgeFaithfulness, winShare } from './judges';
import { buildReplay, replayCorpus } from './replay';
import type { WriteupEvaluator, WriteupExample, WriteupTaskOutput } from './types';

export const REPLY_GENERATED_EVALUATOR = 'reply_generated';
export const REPLY_GATES_EVALUATOR = 'reply_gates';
export const REPLY_WORDS_EVALUATOR = 'reply_words';
export const REPLY_FAITHFULNESS_EVALUATOR = 'reply_faithfulness';
export const REPLY_VS_GOLDEN_EVALUATOR = 'reply_vs_golden';
export const REPLY_VS_BASELINE_EVALUATOR = 'reply_vs_baseline';

const NO_REPLY = { score: null, label: 'n/a', explanation: 'No reply was generated.' };

const gatesFor = ({ rounds, round_index: roundIndex }: WriteupExample['input'], reply: string) =>
  runReplyGates(reply, roundIndex, knownNumbers(replayCorpus(rounds, roundIndex)));

/** Whether the model wrote a reply at all; quality scores below skip runs that didn't. */
export const replyGeneratedEvaluator: WriteupEvaluator = {
  name: REPLY_GENERATED_EVALUATOR,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => ({
    score: output.reply ? 1 : 0,
    explanation: output.reply
      ? `Replied after ${output.extra_calls.length} extra tool call(s).`
      : `No reply: ${output.error}`,
    metadata: { extra_calls: output.extra_calls, cached: Boolean(output.cached) },
  }),
};

/** 1 when the reply passes every deterministic gate, else 0 with the failed gates listed. */
export const replyGatesEvaluator: WriteupEvaluator = {
  name: REPLY_GATES_EVALUATOR,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ input, output }) => {
    if (!output.reply) return NO_REPLY;
    const gates = gatesFor(input, output.reply);
    return {
      score: gates.pass ? 1 : 0,
      label: gates.pass ? 'pass' : 'fail',
      explanation: gates.pass ? 'Every gate passed.' : gates.failed.join('; '),
      metadata: { ...gates.metrics },
    };
  },
};

/** Reply length in words. Neutral: shorter is only better while nothing the reader needs is lost. */
export const replyWordsEvaluator: WriteupEvaluator = {
  name: REPLY_WORDS_EVALUATOR,
  kind: 'CODE',
  direction: 'neutral',
  evaluate: async ({ input, output }) => {
    if (!output.reply) return NO_REPLY;
    const { metrics } = gatesFor(input, output.reply);
    return {
      score: metrics.words,
      explanation: `${metrics.words} words, first sentence ${metrics.leadWords}, ${metrics.points} points.`,
    };
  },
};

interface JudgeDeps {
  inferenceClient: Pick<BoundInferenceClient, 'chatComplete'>;
  evaluationConnector: EvalConnector;
  log?: Pick<ToolingLog, 'warning'>;
  /** Pairwise votes per order. */
  votes: number;
}

const getModelFactory = (evaluationConnector: EvalConnector) => () => {
  const model = buildModelFromConnector(evaluationConnector);
  if (!model.id) return undefined;
  return {
    id: model.id,
    ...(model.family ? { family: model.family } : {}),
    ...(model.provider ? { provider: model.provider } : {}),
  };
};

/** Faithfulness to what the agent had seen, 1–5 normalized to [0, 1]. */
export const createReplyFaithfulnessEvaluator = (deps: JudgeDeps): WriteupEvaluator => ({
  name: REPLY_FAITHFULNESS_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ input, output }) => {
    if (!output.reply) return NO_REPLY;
    const replay = buildReplay(input.rounds, input.round_index, '');
    const result = await judgeFaithfulness(deps.inferenceClient, output.reply, replay, deps.log);
    if (!result) return { score: null, label: 'failed', explanation: 'The judge did not answer.' };
    return {
      score: (result.score - 1) / 4,
      label: `${result.score}/5`,
      explanation: result.unsupported_claims.length
        ? `Unsupported: ${result.unsupported_claims.join(' | ')}`
        : 'No unsupported claims.',
      metadata: { raw_score: result.score, unsupported_claims: result.unsupported_claims },
    };
  },
});

const pairEvaluator = (
  deps: JudgeDeps,
  name: string,
  other: (
    expected: WriteupExample['output'],
    output: WriteupTaskOutput
  ) => { text?: string; missing: string }
): WriteupEvaluator => ({
  name,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ output, expected }) => {
    if (!output.reply) return NO_REPLY;
    const { text, missing } = other(expected, output);
    if (!text) return { score: null, label: 'n/a', explanation: missing };
    const tally = await comparePair(deps.inferenceClient, {
      question: output.question,
      firstRound: output.round_index === 0,
      a: output.reply,
      b: text,
      votes: deps.votes,
      log: deps.log,
    });
    return {
      score: winShare(tally),
      label: `${tally.win}W ${tally.loss}L ${tally.tie}T`,
      explanation: `Pairwise, ${deps.votes} vote(s) in each order${
        tally.failed ? `; ${tally.failed} failed` : ''
      }.`,
      metadata: { ...tally },
    };
  },
});

/** Pairwise against the round's approved golden reply; a tie counts half. */
export const createReplyVsGoldenEvaluator = (deps: JudgeDeps) =>
  pairEvaluator(deps, REPLY_VS_GOLDEN_EVALUATOR, (expected) => ({
    text: expected.golden,
    missing: 'The round has no golden reply.',
  }));

/** Head to head against the same round under the baseline prompt; a tie counts half. */
export const createReplyVsBaselineEvaluator = (deps: JudgeDeps) =>
  pairEvaluator(deps, REPLY_VS_BASELINE_EVALUATOR, (_expected, output) => ({
    text: output.baseline?.reply,
    missing: output.baseline
      ? `The baseline prompt produced no reply: ${output.baseline.error}`
      : 'No NIGHTSHIFT_WRITEUP_BASELINE_PROMPT was set.',
  }));

export const createWriteupEvaluators = (deps: JudgeDeps): WriteupEvaluator[] => [
  replyGeneratedEvaluator,
  replyGatesEvaluator,
  replyWordsEvaluator,
  createReplyFaithfulnessEvaluator(deps),
  createReplyVsGoldenEvaluator(deps),
  createReplyVsBaselineEvaluator(deps),
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Model judges for a free-text chat reply. Faithfulness reads the same context the agent had (the
// replay); the pairwise judge sees only the question and two replies, so it judges the reply, not
// the evidence.

import pRetry from 'p-retry';
import { MessageRole, type BoundInferenceClient, type ToolSchema } from '@kbn/inference-common';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { ToolingLog } from '@kbn/tooling-log';
import { replayText, type Replay } from './replay';

type JudgeClient = Pick<BoundInferenceClient, 'chatComplete'>;

/** Runs one judge call that must answer through `tool`, with retries, inside an inference span. */
export const callJudge = async <T>(
  client: JudgeClient,
  {
    name,
    system,
    user,
    schema,
    parse,
    log,
    retries = 2,
  }: {
    name: string;
    system: string;
    user: string;
    schema: ToolSchema;
    parse: (args: unknown) => T | null;
    log?: Pick<ToolingLog, 'warning'>;
    retries?: number;
  }
): Promise<T | null> =>
  withActiveInferenceSpan(
    name,
    { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
    () =>
      pRetry(
        async () => {
          const response = await client.chatComplete({
            system,
            messages: [{ role: MessageRole.User, content: user }],
            tools: { [name]: { description: 'Return the judgement.', schema } },
            toolChoice: { function: name },
          });
          const call = response.toolCalls.find((c) => c.function.name === name);
          const parsed = call ? parse(call.function.arguments) : null;
          if (!parsed) throw new Error(`${name} returned no valid judgement`);
          return parsed;
        },
        {
          retries,
          onFailedAttempt: (error) =>
            log?.warning(`${name} attempt ${error.attemptNumber} failed: ${error.message}`),
        }
      ).catch(() => null)
  );

export interface ReplyFaithfulness {
  /** 1–5. */
  score: number;
  unsupported_claims: string[];
}

export const FAITHFULNESS_SYSTEM = `You check the chat reply an investigation agent sent at the end of a round against everything it had seen: the user's messages, its tool calls and their results, and its earlier replies.

Score 1-5:
5 = every claim is supported by what the agent saw; nothing invented or overstated.
4 = one minor overstatement or imprecision; no wrong facts.
3 = one claim not supported, or a cause stated more confidently than the evidence allows.
2 = several unsupported claims, or a wrong number, time or component.
1 = the main point of the reply is not supported.

The agent's own earlier claims (in its replies or recorded fields) are not evidence by themselves: a claim must trace back to a tool result or the user. unsupported_claims: quote each one (empty if none).`;

const faithfulnessSchema = {
  type: 'object',
  properties: {
    score: { type: 'number', description: '1-5' },
    unsupported_claims: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'unsupported_claims'],
} as const satisfies ToolSchema;

export const parseFaithfulness = (args: unknown): ReplyFaithfulness | null => {
  const value = (typeof args === 'string' ? JSON.parse(args) : args) as Partial<ReplyFaithfulness>;
  const score = Number(value?.score);
  if (!Number.isFinite(score) || score < 1 || score > 5) return null;
  const claims = Array.isArray(value.unsupported_claims) ? value.unsupported_claims : [];
  return { score, unsupported_claims: claims.map(String) };
};

export const judgeFaithfulness = (
  client: JudgeClient,
  reply: string,
  replay: Replay,
  log?: Pick<ToolingLog, 'warning'>
): Promise<ReplyFaithfulness | null> =>
  callJudge(client, {
    name: 'judge_faithfulness',
    system: FAITHFULNESS_SYSTEM,
    user: `# What the agent had seen\n${replayText(
      replay
    )}\n\n# The reply to check (closing the last round)\n${reply}`,
    schema: faithfulnessSchema,
    parse: parseFaithfulness,
    log,
  });

export const PAIR_SYSTEM = `You compare two chat replies an incident investigation agent could send to close a round. The reader is an on-call SRE. They also have the investigation panel open (summary, verdict, impact, hypotheses with evidence, proposed actions), so the reply is the short answer on top of it, not the report.

When the round is a follow-up question, the better reply answers that question in its first sentence. When it is the first round, the better reply is a short wrap-up: the verdict, then the one open question or next step.

Judge on:
1. Answers first: the first sentence gives the answer or verdict directly.
2. Clarity: easy to read at a glance; one idea per sentence; component names kept, internal operations explained in plain words.
3. What matters: the consequence for the system or users, open questions stated plainly, a specific next step.
4. No padding: no method narration, no restating the panel, no repetition, no headings or tables.

A longer reply is better only if the extra words carry something the reader needs and won't find in the panel. Don't reward detail for its own sake or a confident tone. If they are about equally good, answer "tie".`;

type Winner = 'A' | 'B' | 'tie';

const pairSchema = {
  type: 'object',
  properties: {
    winner: { type: 'string', enum: ['A', 'B', 'tie'] },
    reason: { type: 'string' },
  },
  required: ['winner', 'reason'],
} as const satisfies ToolSchema;

const parseWinner = (args: unknown): Winner | null => {
  const value = (typeof args === 'string' ? JSON.parse(args) : args) as { winner?: string };
  return value?.winner === 'A' || value?.winner === 'B' || value?.winner === 'tie'
    ? value.winner
    : null;
};

export interface PairTally {
  win: number;
  loss: number;
  tie: number;
  failed: number;
}

/** Wins, with a tie counted as half, over the decided votes; null when no vote came back. */
export const winShare = ({ win, loss, tie }: PairTally): number | null =>
  win + loss + tie === 0 ? null : (win + tie / 2) / (win + loss + tie);

/**
 * Compares reply `a` with reply `b`, `votes` times in each order so position bias cancels out.
 * Counts are from `a`'s side.
 */
export const comparePair = async (
  client: JudgeClient,
  {
    question,
    firstRound,
    a,
    b,
    votes,
    log,
  }: {
    question: string;
    firstRound: boolean;
    a: string;
    b: string;
    votes: number;
    log?: Pick<ToolingLog, 'warning'>;
  }
): Promise<PairTally> => {
  const round = `# Round\n${
    firstRound ? "First round (the investigation's trigger)" : 'Follow-up'
  }: ${question.slice(0, 1_500)}`;
  const ask = (first: string, second: string) =>
    callJudge(client, {
      name: 'judge_pair',
      system: PAIR_SYSTEM,
      user: `${round}\n\n# Reply A\n${first}\n\n# Reply B\n${second}`,
      schema: pairSchema,
      parse: parseWinner,
      log,
      retries: 1,
    });
  const tally: PairTally = { win: 0, loss: 0, tie: 0, failed: 0 };
  const add = (winner: Winner | null, aIs: 'A' | 'B') => {
    if (winner === null) tally.failed++;
    else if (winner === 'tie') tally.tie++;
    else if (winner === aIs) tally.win++;
    else tally.loss++;
  };
  await Promise.all(
    Array.from({ length: votes }, () => [
      ask(a, b).then((w) => add(w, 'A')),
      ask(b, a).then((w) => add(w, 'B')),
    ]).flat()
  );
  return tally;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Model judges for a free-text chat reply. Both read the same context the agent had (the replay).
// The pairwise judge also reads what the investigation panel shows, since the reader has it open,
// and judges fit to the question: a short reply wins when the question asked for little, a full
// one when it asked for more. It doesn't know the prompt's rules or the round's reply type.

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

The agent's own earlier claims (in its replies or recorded fields) are not evidence by themselves: a claim must trace back to a tool result or the user. Knowledge-base pages, memories and decision trees describe past incidents, not this one: a cause taken from them without a check in this incident's data is an inference, and stating it as fact is an overstatement. unsupported_claims: quote each one (empty if none).`;

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

export const PAIR_SYSTEM = `You compare two replies an incident investigation agent could send to close a round of a conversation. The reader is an on-call SRE or engineer. They also have the investigation panel open: summary, verdict, impact, hypotheses with evidence, and proposed actions.

You get what the agent had seen in this conversation (the user's messages, its tool calls and their results, its earlier replies), what the panel shows right now, the user's latest message, and the two replies. Use what the agent saw to check the replies. Use the panel to judge what the reply adds: the reader already sees everything on it.

Pick the reply this reader, with this question, would rather receive. Judge in this order:
1. Correct and calibrated. Claims match what the agent saw. A cause that was inferred, or recalled from notes about past incidents, is presented as such. A caveat that matters is stated, with what it changes. A reply with a wrong or overstated claim loses to one without, whatever its other strengths.
2. Leads with what matters. The first sentence gives the answer, the verdict or the problem. What's healthy and the impact come early, so the reader knows the stakes. Negative findings ("no anomalies in X") and side notes come later, not in the headline.
3. Fits the request. Length and form follow what the question needs. A yes/no or follow-up question, a request to summarise, or a request to do something deserves a short reply; doing what was asked plus a useful heads-up is fine. A request for detail, an explanation, a briefing, a list, the queries behind a result, or a visual deserves the full content, in the form that carries it best: a table for rows, a code block for each query, a short label on each step of a timeline, a few headings for a long explanation. Too short fails a reader who asked for more; too long fails one who didn't.
4. Easy to follow. Prefer the reply that:
   - uses plain words ("a few things stand out", not "a few things worth noting about the cohort") and keeps component names;
   - does the work for the reader: derives the number they'd otherwise compute (a duration, a share, a count) and says what a number means here;
   - is organised around what the reader cares about (the affected cluster, service or customer), not around the agent's process;
   - is less dense: one idea per sentence or bullet, room to scan;
   - sounds sure where the evidence is sure, and states a deliberate choice as a choice, not as a limitation;
   - leaves out the agent's internals: the knowledge base, memories, tools, task names or how it searched, unless the user asked how it got a result;
   - doesn't restate what the panel already shows or earlier replies, unless asked. After an investigation, the panel is the full report; the reply is the short version on top of it.

Terser is not better by itself. A reply that adds a derived number, context that explains a figure, or structure that makes it easier to scan beats a shorter one that leaves the reader to work it out. Ask: would cutting anything lose something this reader needs, and is anything they need missing? If the two are about equally good, answer "tie".`;

type Winner = 'A' | 'B' | 'tie';

const pairSchema = {
  type: 'object',
  properties: {
    winner: { type: 'string', enum: ['A', 'B', 'tie'] },
    reason: { type: 'string' },
  },
  required: ['winner', 'reason'],
} as const satisfies ToolSchema;

interface PairVerdict {
  winner: Winner;
  reason: string;
}

const parseVerdict = (args: unknown): PairVerdict | null => {
  const value = (typeof args === 'string' ? JSON.parse(args) : args) as {
    winner?: string;
    reason?: unknown;
  };
  return value?.winner === 'A' || value?.winner === 'B' || value?.winner === 'tie'
    ? { winner: value.winner, reason: String(value.reason ?? '') }
    : null;
};

export interface PairTally {
  win: number;
  loss: number;
  tie: number;
  failed: number;
  /** Each vote with its reason, from the first reply's side, for reading the judge's calls. */
  reasons?: Array<{ winner: 'a' | 'b' | 'tie'; reason: string }>;
}

/** Wins, with a tie counted as half, over the decided votes; null when no vote came back. */
export const winShare = ({ win, loss, tie }: PairTally): number | null =>
  win + loss + tie === 0 ? null : (win + tie / 2) / (win + loss + tie);

/**
 * Compares reply `a` with reply `b`, `votes` times in each order so position bias cancels out.
 * Counts are from `a`'s side. Both replies should have their attachments written out
 * (`expandAttachments`).
 */
export const comparePair = async (
  client: JudgeClient,
  {
    replay,
    panel,
    a,
    b,
    votes,
    log,
  }: {
    replay: Replay;
    /** What the investigation panel shows (`panelText`). */
    panel: string;
    a: string;
    b: string;
    votes: number;
    log?: Pick<ToolingLog, 'warning'>;
  }
): Promise<PairTally> => {
  const context = `# What the agent had seen\n${replayText(
    replay,
    150_000
  )}\n\n# What the panel shows now\n${panel}\n\n# The user's latest message\n${replay.question.slice(
    0,
    3_000
  )}`;
  const ask = (first: string, second: string) =>
    callJudge(client, {
      name: 'judge_pair',
      system: PAIR_SYSTEM,
      user: `${context}\n\n# Reply A\n${first}\n\n# Reply B\n${second}`,
      schema: pairSchema,
      parse: parseVerdict,
      log,
      retries: 1,
    });
  const tally: Required<PairTally> = { win: 0, loss: 0, tie: 0, failed: 0, reasons: [] };
  const add = (verdict: PairVerdict | null, aIs: 'A' | 'B') => {
    if (verdict === null) {
      tally.failed++;
      return;
    }
    const winner = verdict.winner === 'tie' ? 'tie' : verdict.winner === aIs ? 'a' : 'b';
    if (winner === 'tie') tally.tie++;
    else if (winner === 'a') tally.win++;
    else tally.loss++;
    tally.reasons.push({ winner, reason: verdict.reason });
  };
  await Promise.all(
    Array.from({ length: votes }, () => [
      ask(a, b).then((v) => add(v, 'A')),
      ask(b, a).then((v) => add(v, 'B')),
    ]).flat()
  );
  return tally;
};

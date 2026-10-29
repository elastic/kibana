/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NUMBER, normalizeNumber } from './gates';
import { resultText } from './replay';
import type { WriteupConversation } from './datasets';
import type { RecordedRound } from './types';

/**
 * Tool results are stored clipped to this many characters. A replay reads at most 20,000 of the
 * replayed round's results and 4,000 of earlier rounds', and the dataset upsert caps a whole
 * dataset at 5 MiB, so this keeps a handful of multi-round investigations under the cap.
 */
export const DEFAULT_RESULT_CAP = 8_000;

interface RawRound {
  id?: string;
  status?: string;
  input?: { message?: string };
  steps?: Array<Record<string, unknown>>;
  response?: { message?: string };
}

/** Numbers of two or more digits in `clipped` that `kept` doesn't contain. */
const numbersLost = (kept: string, clipped: string): string[] => {
  const seen = new Set((kept.match(NUMBER) ?? []).map(normalizeNumber));
  return (clipped.match(NUMBER) ?? [])
    .map(normalizeNumber)
    .filter((n) => n.replace(/\D/g, '').length >= 2 && !seen.has(n));
};

const reduceStep = (step: Record<string, unknown>, resultCap: number, lost: Set<string>) => {
  if (step.type === 'reasoning')
    return { type: 'reasoning', reasoning: String(step.reasoning ?? '') };
  if (step.type !== 'tool_call' || typeof step.tool_id !== 'string') return undefined;
  const results = Array.isArray(step.results) ? (step.results as unknown[]) : [];
  const text = resultText(results);
  const first = results[0] as { type?: string; data?: unknown } | undefined;
  if (text.length > resultCap) {
    for (const n of numbersLost(text.slice(0, resultCap), text.slice(resultCap))) lost.add(n);
  }
  return {
    type: 'tool_call',
    tool_id: step.tool_id,
    ...(typeof step.tool_call_id === 'string' ? { tool_call_id: step.tool_call_id } : {}),
    params: (step.params as Record<string, unknown>) ?? {},
    results: first
      ? [
          {
            ...(first.type ? { type: first.type } : {}),
            data: text.length > resultCap ? `${text.slice(0, resultCap)} …[truncated]` : first.data,
          },
        ]
      : [],
  };
};

/**
 * Reduces an exported Agent Builder conversation to what a replay reads: each finished round's
 * user message, reasoning and tool calls (results clipped to `resultCap`), and reply. A round that
 * never finished, and anything after it, is dropped.
 */
export const toWriteupConversation = (
  caseId: string,
  rounds: readonly RawRound[],
  {
    resultCap = DEFAULT_RESULT_CAP,
    goldens = [],
  }: { resultCap?: number; goldens?: WriteupConversation['goldens'] } = {}
): WriteupConversation => {
  const finished: RecordedRound[] = [];
  for (const round of rounds) {
    if ((round.status && round.status !== 'completed') || !round.response?.message) break;
    const lost = new Set<string>();
    finished.push({
      ...(round.id ? { id: round.id } : {}),
      input: { message: round.input?.message ?? '' },
      steps: (round.steps ?? []).flatMap((s) => reduceStep(s, resultCap, lost) ?? []),
      response: { message: round.response.message },
      ...(lost.size ? { clipped_numbers: [...lost].sort() } : {}),
    });
  }
  if (!finished.length) throw new Error(`Conversation ${caseId} has no finished round`);
  return {
    case_id: caseId,
    rounds: finished,
    goldens: goldens.filter((g) => g.round_index < finished.length),
  };
};

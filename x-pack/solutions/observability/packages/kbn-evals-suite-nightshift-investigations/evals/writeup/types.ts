/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Evaluator } from '@kbn/evals';

const stepSchema = z
  .object({
    type: z.string().optional(),
    reasoning: z.string().optional(),
    tool_id: z.string().optional(),
    tool_call_id: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    results: z.array(z.object({ type: z.string().optional(), data: z.unknown() })).optional(),
  })
  .passthrough();

/** One Agent Builder conversation round, reduced to what a replay reads. */
export const recordedRoundSchema = z
  .object({
    id: z.string().optional(),
    input: z.object({ message: z.string() }),
    steps: z.array(stepSchema),
    response: z.object({ message: z.string() }).optional(),
    /**
     * Numbers that were in this round's tool results before they were clipped for storage, so the
     * grounding gate still knows the agent saw them.
     */
    clipped_numbers: z.array(z.string()).optional(),
  })
  .passthrough();
export type RecordedRound = z.infer<typeof recordedRoundSchema>;

/**
 * One replayed round: the conversation up to and including round `round_index`, with that
 * round's reply held out. Earlier rounds keep the reply the agent sent.
 */
export const writeupExampleSchema = z.object({
  input: z.object({
    rounds: z.array(recordedRoundSchema).min(1),
    round_index: z.number().int().min(0),
  }),
  output: z.object({
    /** The reply production sent at the end of the replayed round. */
    recorded_reply: z.string(),
    /** An approved reply for the round, if one exists. */
    golden: z.string().optional(),
  }),
  metadata: z
    .object({
      case_id: z.string().min(1),
      conversation_case_id: z.string().min(1),
      round_index: z.number().int().min(0),
    })
    .passthrough(),
});
export type WriteupExample = z.infer<typeof writeupExampleSchema>;

/** A reply one prompt produced for a replayed round. */
export interface GeneratedReply {
  reply?: string;
  /** Tools the model called before it replied, in order. */
  extra_calls: string[];
  error?: string;
  /** Read from the generation cache rather than the model. */
  cached?: boolean;
}

export interface WriteupTaskOutput extends GeneratedReply {
  case_id: string;
  round_index: number;
  /** The question the round answered; for the first round, the investigation's trigger. */
  question: string;
  recorded_reply: string;
  /** Characters of replayed history, after clipping. */
  replay_chars: number;
  /** Short hash of the system prompt under test. */
  prompt_hash: string;
  /** The same round under `NIGHTSHIFT_WRITEUP_BASELINE_PROMPT`, when set. */
  baseline?: GeneratedReply & { prompt_hash: string };
}

export type WriteupEvaluator = Evaluator<WriteupExample, WriteupTaskOutput>;

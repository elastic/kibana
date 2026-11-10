/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  WIKI_ENTITY_TYPES,
  WIKI_PAGE_STATUSES,
  type WikiEntityType,
  type WikiPageStatus,
} from '@kbn/nightshift-investigations-plugin/common/wiki';

const MAX_MESSAGE_LENGTH = 50_000;

export const WIKI_REPLAY_ROUND_KINDS = ['initial', 'follow_up'] as const;
export type WikiReplayRoundKind = (typeof WIKI_REPLAY_ROUND_KINDS)[number];

export const WIKI_REPLAY_EXAMPLE_KINDS = [
  'tool_failure',
  'follow_up',
  'dedup',
  'contradiction',
  'noop',
] as const;

export const WIKI_PAGE_EFFECTS = [
  'created',
  'corroborated',
  'archived',
  'rewritten',
  /** Rewritten or archived: the claim no longer stands as it was written. */
  'revised',
  'untouched',
] as const;
export type WikiPageEffect = (typeof WIKI_PAGE_EFFECTS)[number];

const entityTypeSchema = lazySchema(() => z.enum(WIKI_ENTITY_TYPES));

const replayToolCallSchema = lazySchema(() =>
  z.object({
    tool_id: z.string().min(1).max(200),
    params: z.record(z.string(), z.json()).default({}),
    /** The call's result as the optimizer would have seen it; absent for a call with no result. */
    result: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  })
);

const replayRoundSchema = lazySchema(() =>
  z.object({
    kind: z.enum(WIKI_REPLAY_ROUND_KINDS),
    /** The round's user turn: the question, or a follow-up message. */
    user_message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
    assistant_message: z.string().max(MAX_MESSAGE_LENGTH),
    /** The previous round's request and final answer, which a follow-up refers to. */
    previous_user_message: z.string().max(MAX_MESSAGE_LENGTH).optional(),
    previous_assistant_message: z.string().max(MAX_MESSAGE_LENGTH).optional(),
    tool_calls: z.array(replayToolCallSchema).max(500).default([]),
  })
);

const seedPageSchema = lazySchema(() =>
  z.object({
    entity_type: entityTypeSchema,
    slug: z.string().min(1).max(80),
    title: z.string().min(1).max(512),
    description: z.string().max(2_048).optional(),
    content: z.string().max(65_536),
    status: z.enum(WIKI_PAGE_STATUSES).default('tentative'),
    corroborations: z.number().int().min(0).default(0),
    /** Conversation the page's provenance names, so a follow-up can find it. */
    conversation_id: z.string().max(200).optional(),
  })
);

/**
 * A page matches when its type fits and every term appears in its slug, title or content. A term may
 * list alternatives separated by `|`, any of which satisfies it.
 */
const pageMatchSchema = lazySchema(() =>
  z.object({
    entity_type: entityTypeSchema.optional(),
    terms: z.array(z.string().min(1).max(200)).min(1).max(10),
  })
);

const captureSchema = lazySchema(() =>
  pageMatchSchema.extend({
    /** When set, the terms must appear under this `##` heading rather than anywhere on the page. */
    section: z.string().min(1).max(100).optional(),
  })
);

const effectSchema = lazySchema(() =>
  z.object({
    match: pageMatchSchema,
    /** Zero-based round after which the effect is checked. */
    round: z.number().int().min(0).max(9),
    effect: z.enum(WIKI_PAGE_EFFECTS),
  })
);

const expectedSchema = lazySchema(() =>
  z.object({
    /** Durable knowledge the pages must end up holding, per type and section. */
    must_capture: z.array(captureSchema).max(20).default([]),
    /** Case-specific details no page may contain (a cause, an id, a count), as plain substrings. */
    must_not: z.array(z.string().min(1).max(500)).max(50).default([]),
    /** What each round must do to matching pages. */
    effects: z.array(effectSchema).max(20).default([]),
    /** Upper bound on pages the optimizer may write; 0 asserts a round that learns nothing. */
    max_pages_written: z.number().int().min(0).max(100).optional(),
    /** Upper bound on pages matching a description, which catches near-duplicate pages. */
    max_pages_matching: z
      .array(z.object({ match: pageMatchSchema, max: z.number().int().min(0).max(100) }))
      .max(20)
      .default([]),
  })
);

export const wikiReplayExampleSchema = lazySchema(() =>
  z.object({
    input: z.object({
      /** Rounds replayed in order against one page store. */
      rounds: z.array(replayRoundSchema).min(1).max(10),
      /** Pages the wiki already holds before the first round. */
      seed_pages: z.array(seedPageSchema).max(50).default([]),
    }),
    output: expectedSchema,
    metadata: z
      .object({
        case_id: z.string().trim().min(1).max(500),
        kind: z.enum(WIKI_REPLAY_EXAMPLE_KINDS),
      })
      .catchall(z.json()),
  })
);

export type WikiReplayExample = z.infer<typeof wikiReplayExampleSchema>;
export type WikiReplayRound = WikiReplayExample['input']['rounds'][number];
export type WikiReplayExpected = WikiReplayExample['output'];
export type WikiPageMatch = z.infer<typeof pageMatchSchema>;

/** A page as the wiki held it at a point in the replay. */
export interface WikiPageSnapshot {
  id: string;
  entity_type: WikiEntityType;
  slug: string;
  title: string;
  status: WikiPageStatus;
  corroborations: number;
  content: string;
  conversation_id?: string;
  doc_version?: number;
}

export interface WikiRoundResult {
  kind: WikiReplayRound['kind'];
  /** A plain-text rendering of the messages the optimizer's model was shown. */
  transcript: string;
  proposed_edits: Array<{
    action: string;
    entity_type: string;
    slug: string;
    title: string;
    content?: string;
  }>;
  pages_before: WikiPageSnapshot[];
  pages_after: WikiPageSnapshot[];
}

export interface WikiOptimizeTaskOutput {
  case_id: string;
  rounds: WikiRoundResult[];
  /** Pages in the wiki when the replay ended. */
  pages: WikiPageSnapshot[];
  /** Ids of the pages that existed before the first round. */
  seeded_ids: string[];
  error?: string;
}

export type WikiOptimizeEvaluator = Evaluator<WikiReplayExample, WikiOptimizeTaskOutput>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  describeMessages,
  optimizeWiki,
  type ProposeWikiEdits,
} from '@kbn/nightshift-investigations-plugin/server/wiki/optimize';
import {
  createWikiPageStore,
  type WikiPageStore,
} from '@kbn/nightshift-investigations-plugin/server/wiki/page_store';
import type { WikiTelemetry } from '@kbn/nightshift-investigations-plugin/server/telemetry';
import { createFakeEsClient } from './fake_es_client';
import type {
  WikiOptimizeTaskOutput,
  WikiPageSnapshot,
  WikiReplayExample,
  WikiReplayRound,
  WikiRoundResult,
} from './types';

const EVAL_SPACE_ID = 'eval';
const EVAL_INDEX = 'eval-nightshift-wiki';

const noopTelemetry: WikiTelemetry = {
  reportHydrated: () => {},
  reportEditsApplied: () => {},
};

const toInvestigationToolCall = (call: WikiReplayRound['tool_calls'][number]) => ({
  tool_id: call.tool_id,
  params: call.params,
  ...(call.result !== undefined ? { results: [call.result] } : {}),
});

const snapshotPages = async (store: WikiPageStore): Promise<WikiPageSnapshot[]> => {
  const { pages } = await store.list();
  const full = await Promise.all(pages.map(({ id }) => store.get(id)));
  return full.flatMap((page) =>
    page
      ? [
          {
            id: page.id,
            entity_type: page.entity_type,
            slug: page.slug,
            title: page.title,
            status: page.status,
            corroborations: page.corroborations,
            content: page.content,
            ...(page.conversation_id ? { conversation_id: page.conversation_id } : {}),
            ...(page.doc_version !== undefined ? { doc_version: page.doc_version } : {}),
          },
        ]
      : []
  );
};

/**
 * Replays the example's rounds through the real optimizer, one after another against one page store,
 * and records what the model was shown, what it proposed and what the wiki held after each round.
 * No investigation runs: the rounds carry the user turn, tool calls and final answer a trace saved.
 */
export const runWikiReplay = async ({
  example,
  proposeEdits,
  logger,
}: {
  example: WikiReplayExample;
  proposeEdits: ProposeWikiEdits;
  logger: Logger;
}): Promise<WikiOptimizeTaskOutput> => {
  const caseId = example.metadata.case_id;
  const conversationId = `conversation-${caseId}`;
  const store = createWikiPageStore({
    esClient: createFakeEsClient(),
    logger,
    spaceId: EVAL_SPACE_ID,
    destValue: EVAL_INDEX,
  });

  for (const seed of example.input.seed_pages) {
    await store.upsert({
      entityType: seed.entity_type,
      slug: seed.slug,
      title: seed.title,
      description: seed.description,
      content: seed.content,
      status: seed.status,
      corroborations: seed.corroborations,
      conversationId: seed.conversation_id,
      // A seeded page was written by its conversation, as the optimizer records for a real write.
      ...(seed.conversation_id ? { authoredBy: [seed.conversation_id] } : {}),
    });
  }

  const seededPages = await snapshotPages(store);
  const rounds: WikiRoundResult[] = [];
  try {
    for (const [index, round] of example.input.rounds.entries()) {
      const pagesBefore = await snapshotPages(store);
      let transcript = '';
      let proposed: WikiRoundResult['proposed_edits'] = [];
      const recordingProposeEdits: ProposeWikiEdits = async (input) => {
        transcript = describeMessages(input.messages);
        const result = await proposeEdits(input);
        proposed = result.edits;
        return result;
      };

      await optimizeWiki({
        store,
        proposeEdits: recordingProposeEdits,
        userMessage: round.user_message,
        assistantMessage: round.assistant_message,
        toolCalls: round.tool_calls.map(toInvestigationToolCall),
        roundKind: round.kind,
        previousUserMessage: round.previous_user_message,
        previousAssistantMessage: round.previous_assistant_message,
        telemetry: noopTelemetry,
        provenance: {
          conversationId,
          roundId: `round-${index}`,
          workflowExecutionId: `execution-${index}`,
        },
        logger,
      });

      rounds.push({
        kind: round.kind,
        transcript,
        proposed_edits: proposed,
        pages_before: pagesBefore,
        pages_after: await snapshotPages(store),
      });
    }
  } catch (error) {
    return {
      case_id: caseId,
      rounds,
      pages: await snapshotPages(store),
      seeded_ids: seededPages.map(({ id }) => id),
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    case_id: caseId,
    rounds,
    pages: await snapshotPages(store),
    seeded_ids: seededPages.map(({ id }) => id),
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import { nonEmptyStringRt, toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { FunctionDefinition } from '../../../common/functions/types';
import { KnowledgeBaseEntryRole } from '../../../common/types';
import type { RecalledEntry } from '../../service/knowledge_base_service';
import { getSystemMessageFromInstructions } from '../../service/util/get_system_message_from_instructions';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';

const getFunctionsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/functions',
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    functionDefinitions: FunctionDefinition[];
    systemMessage: string;
  }> => {
    const { service, request } = resources;

    const controller = new AbortController();
    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const client = await service.getClient({ request });

    const [functionClient, userInstructions] = await Promise.all([
      service.getFunctionClient({
        signal: controller.signal,
        resources,
        client,
        screenContexts: [],
      }),
      // error is caught in client
      client.getKnowledgeBaseUserInstructions(),
    ]);

    const functionDefinitions = functionClient.getFunctions().map((fn) => fn.definition);

    const availableFunctionNames = functionDefinitions.map((def) => def.name);

    return {
      functionDefinitions: functionClient.getFunctions().map((fn) => fn.definition),
      systemMessage: getSystemMessageFromInstructions({
        applicationInstructions: functionClient.getInstructions(),
        userInstructions,
        adHocInstructions: [],
        availableFunctionNames,
      }),
    };
  },
});

const functionRecallRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/recall',
  params: t.type({
    body: t.intersection([
      t.type({
        queries: t.array(
          t.intersection([
            t.type({
              text: t.string,
            }),
            t.partial({
              boost: t.number,
            }),
          ])
        ),
      }),
      t.partial({
        categories: t.array(t.string),
      }),
    ]),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    entries: RecalledEntry[];
  }> => {
    const client = await resources.service.getClient({ request: resources.request });

    const {
      body: { queries, categories },
    } = resources.params;

    if (!client) {
      throw notImplemented();
    }

    return client.recall({ queries, categories });
  },
});

const functionSummariseRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/summarize',
  params: t.type({
    body: t.type({
      id: t.string,
      text: nonEmptyStringRt,
      confidence: t.union([t.literal('low'), t.literal('medium'), t.literal('high')]),
      is_correction: toBooleanRt,
      type: t.union([t.literal('user_instruction'), t.literal('contextual')]),
      public: toBooleanRt,
      labels: t.record(t.string, t.string),
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    const {
      confidence,
      id,
      is_correction: isCorrection,
      type,
      text,
      public: isPublic,
      labels,
    } = resources.params.body;

    return client.addKnowledgeBaseEntry({
      entry: {
        confidence,
        id,
        doc_id: id,
        is_correction: isCorrection,
        type,
        text,
        public: isPublic,
        labels,
        role: KnowledgeBaseEntryRole.AssistantSummarization,
      },
    });
  },
});

export const functionRoutes = {
  ...getFunctionsRoute,
  ...functionRecallRoute,
  ...functionSummariseRoute,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MlDeploymentAllocationState,
  MlDeploymentState,
} from '@elastic/elasticsearch/lib/api/types';
import pLimit from 'p-limit';
import { notImplemented } from '@hapi/boom';
import { nonEmptyStringRt, toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { Instruction, KnowledgeBaseEntry, KnowledgeBaseEntryRole } from '../../../common/types';

const getKnowledgeBaseStatus = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/kb/status',
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    enabled: boolean;
    ready: boolean;
    error?: any;
    deployment_state?: MlDeploymentState;
    allocation_state?: MlDeploymentAllocationState;
    model_name?: string;
  }> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    return await client.getKnowledgeBaseStatus();
  },
});

const setupKnowledgeBase = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
  options: {
    tags: ['access:ai_assistant'],
    timeout: {
      idleSocket: 20 * 60 * 1000, // 20 minutes
    },
  },
  handler: async (resources): Promise<{}> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    await client.setupKnowledgeBase();

    return {};
  },
});

const getKnowledgeBaseUserInstructions = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    userInstructions: Array<Instruction & { public?: boolean }>;
  }> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    return {
      userInstructions: await client.getKnowledgeBaseUserInstructions(),
    };
  },
});

const saveKnowledgeBaseUserInstruction = createObservabilityAIAssistantServerRoute({
  endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
  params: t.type({
    body: t.type({
      id: t.string,
      text: nonEmptyStringRt,
      public: toBooleanRt,
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

    const { id, text, public: isPublic } = resources.params.body;
    return client.addUserInstruction({
      entry: { id, text, public: isPublic },
    });
  },
});

const getKnowledgeBaseEntries = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.type({
    query: t.type({
      query: t.string,
      sortBy: t.string,
      sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
    }),
  }),
  handler: async (
    resources
  ): Promise<{
    entries: KnowledgeBaseEntry[];
  }> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    const { query, sortBy, sortDirection } = resources.params.query;

    return await client.getKnowledgeBaseEntries({ query, sortBy, sortDirection });
  },
});

const knowledgeBaseEntryRt = t.intersection([
  t.type({
    id: t.string,
    title: t.string,
    text: nonEmptyStringRt,
  }),
  t.partial({
    confidence: t.union([t.literal('low'), t.literal('medium'), t.literal('high')]),
    is_correction: toBooleanRt,
    public: toBooleanRt,
    labels: t.record(t.string, t.string),
    role: t.union([
      t.literal(KnowledgeBaseEntryRole.AssistantSummarization),
      t.literal(KnowledgeBaseEntryRole.UserEntry),
      t.literal(KnowledgeBaseEntryRole.Elastic),
    ]),
  }),
]);

const saveKnowledgeBaseEntry = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
  params: t.type({
    body: knowledgeBaseEntryRt,
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    const entry = resources.params.body;
    return client.addKnowledgeBaseEntry({
      entry: {
        confidence: 'high',
        is_correction: false,
        public: true,
        labels: {},
        role: KnowledgeBaseEntryRole.UserEntry,
        ...entry,
      },
    });
  },
});

const deleteKnowledgeBaseEntry = createObservabilityAIAssistantServerRoute({
  endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
  params: t.type({
    path: t.type({
      entryId: t.string,
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

    return client.deleteKnowledgeBaseEntry(resources.params.path.entryId);
  },
});

const importKnowledgeBaseEntries = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
  params: t.type({
    body: t.type({
      entries: t.array(knowledgeBaseEntryRt),
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

    const status = await client.getKnowledgeBaseStatus();
    if (!status.ready) {
      throw new Error('Knowledge base is not ready');
    }

    const limiter = pLimit(5);

    const promises = resources.params.body.entries.map(async (entry) => {
      return limiter(async () => {
        return client.addKnowledgeBaseEntry({
          entry: {
            confidence: 'high',
            is_correction: false,
            public: true,
            labels: {},
            role: KnowledgeBaseEntryRole.UserEntry,
            ...entry,
          },
        });
      });
    });

    await Promise.all(promises);
  },
});

export const knowledgeBaseRoutes = {
  ...setupKnowledgeBase,
  ...getKnowledgeBaseStatus,
  ...getKnowledgeBaseEntries,
  ...saveKnowledgeBaseUserInstruction,
  ...importKnowledgeBaseEntries,
  ...getKnowledgeBaseUserInstructions,
  ...saveKnowledgeBaseEntry,
  ...deleteKnowledgeBaseEntry,
};

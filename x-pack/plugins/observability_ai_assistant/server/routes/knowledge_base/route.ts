/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import { nonEmptyStringRt, toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import type { KnowledgeBaseEntry } from '../../../common/types';

const getKnowledgeBaseStatus = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/kb/status',
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    ready: boolean;
    error?: any;
    deployment_state?: string;
    allocation_state?: string;
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

const getKnowledgeBaseEntries = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    entries: KnowledgeBaseEntry[];
  }> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    return await client.getKnowledgeBaseEntries();
  },
});

const saveKnowledgeBaseEntry = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
  params: t.type({
    body: t.type({
      id: t.string,
      text: nonEmptyStringRt,
      confidence: t.union([t.literal('low'), t.literal('medium'), t.literal('high')]),
      is_correction: toBooleanRt,
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
      text,
      public: isPublic,
      labels,
    } = resources.params.body;

    return client.createKnowledgeBaseEntry({
      entry: {
        confidence,
        id,
        is_correction: isCorrection,
        text,
        public: isPublic,
        labels,
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

export const knowledgeBaseRoutes = {
  ...setupKnowledgeBase,
  ...getKnowledgeBaseStatus,
  ...getKnowledgeBaseEntries,
  ...saveKnowledgeBaseEntry,
  ...deleteKnowledgeBaseEntry,
};

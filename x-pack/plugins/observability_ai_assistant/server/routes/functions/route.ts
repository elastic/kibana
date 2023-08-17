/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { nonEmptyStringRt, toBooleanRt } from '@kbn/io-ts-utils';
import { notImplemented } from '@hapi/boom';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { KnowledgeBaseEntry } from '../../../common/types';

const functionElasticsearchRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/elasticsearch',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.type({
    body: t.intersection([
      t.type({
        method: t.union([
          t.literal('GET'),
          t.literal('POST'),
          t.literal('PATCH'),
          t.literal('PUT'),
          t.literal('DELETE'),
        ]),
        path: t.string,
      }),
      t.partial({
        body: t.any,
      }),
    ]),
  }),
  handler: async (resources): Promise<unknown> => {
    const { method, path, body } = resources.params.body;

    const response = await (
      await resources.context.core
    ).elasticsearch.client.asCurrentUser.transport.request({
      method,
      path,
      body,
    });

    return response;
  },
});

const functionRecallRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/recall',
  params: t.type({
    body: t.type({
      query: nonEmptyStringRt,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<{ entries: KnowledgeBaseEntry[] }> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    return client.recall(resources.params.body.query);
  },
});

const functionSummariseRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/summarise',
  params: t.type({
    body: t.type({
      id: t.string,
      text: nonEmptyStringRt,
      confidence: t.union([t.literal('low'), t.literal('medium'), t.literal('high')]),
      is_correction: toBooleanRt,
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

    const {
      confidence,
      id,
      is_correction: isCorrection,
      text,
      public: isPublic,
    } = resources.params.body;

    return client.summarise({
      entry: {
        confidence,
        id,
        is_correction: isCorrection,
        text,
        public: isPublic,
      },
    });
  },
});

const getKnowledgeBaseStatus = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/functions/kb_status',
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

const setupKnowledgeBaseRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/setup_kb',
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

export const functionRoutes = {
  ...functionElasticsearchRoute,
  ...functionRecallRoute,
  ...functionSummariseRoute,
  ...setupKnowledgeBaseRoute,
  ...getKnowledgeBaseStatus,
};

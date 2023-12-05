/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import { nonEmptyStringRt, toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { ContextDefinition, FunctionDefinition } from '../../../common/types';
import type { RecalledEntry } from '../../service/kb_service';
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
    contextDefinitions: ContextDefinition[];
  }> => {
    const { service, request } = resources;

    const controller = new AbortController();
    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const client = await service.getClient({ request });

    const functionClient = await service.getFunctionClient({
      signal: controller.signal,
      resources,
      client,
    });

    return {
      functionDefinitions: functionClient.getFunctions().map((fn) => fn.definition),
      contextDefinitions: functionClient.getContexts(),
    };
  },
});

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
    body: t.intersection([
      t.type({
        queries: t.array(nonEmptyStringRt),
      }),
      t.partial({
        contexts: t.array(t.string),
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
      body: { queries, contexts },
    } = resources.params;

    if (!client) {
      throw notImplemented();
    }

    return client.recall({ queries, contexts });
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

    return client.summarize({
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

const functionGetDatasetInfoRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/get_dataset_info',
  params: t.type({
    body: t.type({
      index: t.string,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    indices: string[];
    fields: Array<{ name: string; description: string; type: string }>;
  }> => {
    const esClient = (await resources.context.core).elasticsearch.client.asCurrentUser;

    const savedObjectsClient = (await resources.context.core).savedObjects.getClient();

    const index = resources.params.body.index;

    let indices: string[] = [];

    try {
      const body = await esClient.indices.resolveIndex({
        name: index === '' ? '*' : index,
        expand_wildcards: 'open',
      });
      indices = [...body.indices.map((i) => i.name), ...body.data_streams.map((d) => d.name)];
    } catch (e) {
      indices = [];
    }

    if (index === '') {
      return {
        indices,
        fields: [],
      };
    }

    if (indices.length === 0) {
      return {
        indices,
        fields: [],
      };
    }

    const dataViews = await (
      await resources.plugins.dataViews.start()
    ).dataViewsServiceFactory(savedObjectsClient, esClient);

    const fields = await dataViews.getFieldsForWildcard({
      pattern: index,
    });

    // else get all the fields for the found dataview
    return {
      indices: [index],
      fields: fields.flatMap((field) => {
        return (field.esTypes ?? [field.type]).map((type) => {
          return {
            name: field.name,
            description: field.customLabel || '',
            type,
          };
        });
      }),
    };
  },
});

export const functionRoutes = {
  ...getFunctionsRoute,
  ...functionElasticsearchRoute,
  ...functionRecallRoute,
  ...functionSummariseRoute,
  ...setupKnowledgeBaseRoute,
  ...getKnowledgeBaseStatus,
  ...functionGetDatasetInfoRoute,
};

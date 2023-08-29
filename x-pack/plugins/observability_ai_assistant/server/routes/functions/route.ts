/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { notImplemented } from '@hapi/boom';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { nonEmptyStringRt, toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { omit } from 'lodash';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { KnowledgeBaseEntry } from '../../../common/types';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';

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

const OMITTED_ALERT_FIELDS = [
  'tags',
  'event.action',
  'event.kind',
  'kibana.alert.rule.execution.uuid',
  'kibana.alert.rule.revision',
  'kibana.alert.rule.tags',
  'kibana.alert.rule.uuid',
  'kibana.alert.workflow_status',
  'kibana.space_ids',
  'kibana.alert.time_range',
  'kibana.version',
] as const;

const functionAlertsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/alerts',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.type({
    body: t.intersection([
      t.type({
        featureIds: t.array(t.string),
        start: t.string,
        end: t.string,
      }),
      t.partial({
        filter: t.string,
      }),
    ]),
  }),
  handler: async (
    resources
  ): Promise<{
    content: {
      total: number;
      alerts: ParsedTechnicalFields[];
    };
  }> => {
    const {
      featureIds,
      start: startAsDatemath,
      end: endAsDatemath,
      filter,
    } = resources.params.body;

    const racContext = await resources.context.rac;
    const alertsClient = await racContext.getAlertsClient();

    const start = datemath.parse(startAsDatemath)!.valueOf();
    const end = datemath.parse(endAsDatemath)!.valueOf();

    const kqlQuery = !filter ? [] : [toElasticsearchQuery(fromKueryExpression(filter))];

    const response = await alertsClient.find({
      featureIds,

      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                },
              },
            },
            ...kqlQuery,
          ],
        },
      },
    });

    // trim some fields
    const alerts = response.hits.hits.map((hit) =>
      omit(hit._source, ...OMITTED_ALERT_FIELDS)
    ) as unknown as ParsedTechnicalFields[];

    return {
      content: {
        total: (response.hits as { total: { value: number } }).total.value,
        alerts,
      },
    };
  },
});

const functionRecallRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/recall',
  params: t.type({
    body: t.type({
      queries: t.array(nonEmptyStringRt),
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{ entries: Array<Pick<KnowledgeBaseEntry, 'text' | 'id'>> }> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    return client.recall(resources.params.body.queries);
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

    return client.summarise({
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

export const functionRoutes = {
  ...functionElasticsearchRoute,
  ...functionRecallRoute,
  ...functionSummariseRoute,
  ...setupKnowledgeBaseRoute,
  ...getKnowledgeBaseStatus,
  ...functionAlertsRoute,
};

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
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { KnowledgeBaseEntryRole } from '../../../common/types';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import type { RecalledEntry } from '../../service/knowledge_base_service';

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
        includeRecovered: toBooleanRt,
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
      includeRecovered,
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
            ...(!includeRecovered
              ? [
                  {
                    term: {
                      [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                    },
                  },
                ]
              : []),
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

    return client.createKnowledgeBaseEntry({
      entry: {
        confidence,
        id,
        doc_id: id,
        is_correction: isCorrection,
        text,
        public: isPublic,
        labels,
        role: KnowledgeBaseEntryRole.AssistantSummarization,
      },
    });
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
  ...functionElasticsearchRoute,
  ...functionRecallRoute,
  ...functionSummariseRoute,
  ...functionAlertsRoute,
  ...functionGetDatasetInfoRoute,
};

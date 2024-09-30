/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { KibanaRequest } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { FunctionVisibility } from '@kbn/observability-ai-assistant-plugin/common';
import { getRelevantFieldNames } from '@kbn/observability-ai-assistant-plugin/server/functions/get_dataset_info/get_relevant_field_names';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { omit } from 'lodash';
import { FunctionRegistrationParameters } from '.';

const defaultFields = [
  '@timestamp',
  'kibana.alert.start',
  'kibana.alert.end',
  'kibana.alert.flapping',
  'kibana.alert.group',
  'kibana.alert.instance.id',
  'kibana.alert.reason',
  'kibana.alert.rule.category',
  'kibana.alert.rule.name',
  'kibana.alert.rule.tags',
  'kibana.alert.start',
  'kibana.alert.status',
  'kibana.alert.time_range.gte',
  'kibana.alert.time_range.lte',
  'kibana.alert.workflow_status',
  'tags',
  // infra
  'host.name',
  'container.id',
  'kubernetes.pod.name',
  // APM
  'processor.event',
  'service.environment',
  'service.name',
  'service.node.name',
  'transaction.type',
  'transaction.name',
];

const OMITTED_ALERT_FIELDS = [
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

const DEFAULT_FEATURE_IDS = [
  'apm',
  'infrastructure',
  'logs',
  'uptime',
  'slo',
  'observability',
] as const;

export function registerAlertsFunction({
  functions,
  resources,
  pluginsStart,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: 'get_alerts_dataset_info',
      visibility: FunctionVisibility.AssistantOnly,
      description: `Use this function to get information about alerts data.`,
      parameters: {
        type: 'object',
        properties: {
          start: {
            type: 'string',
            description:
              'The start of the current time range, in datemath, like now-24h or an ISO timestamp',
          },
          end: {
            type: 'string',
            description:
              'The end of the current time range, in datemath, like now-24h or an ISO timestamp',
          },
        },
      } as const,
    },
    async (
      { arguments: { start, end }, chat, messages },
      signal
    ): Promise<{
      content: {
        fields: string[];
      };
    }> => {
      const core = await resources.context.core;

      const { fields } = await getRelevantFieldNames({
        index: `.alerts-observability*`,
        messages,
        esClient: core.elasticsearch.client.asInternalUser,
        dataViews: await resources.plugins.dataViews.start(),
        savedObjectsClient: core.savedObjects.client,
        signal,
        chat: (
          operationName,
          { messages: nextMessages, functionCall, functions: nextFunctions }
        ) => {
          return chat(operationName, {
            messages: nextMessages,
            functionCall,
            functions: nextFunctions,
            signal,
          });
        },
      });

      return {
        content: {
          fields: fields.length === 0 ? defaultFields : fields,
        },
      };
    },
    ['observability']
  );

  functions.registerFunction(
    {
      name: 'alerts',
      description: `Get alerts for Observability.  Make sure get_alerts_dataset_info was called before.
        Use this to get open (and optionally recovered) alerts for Observability assets, like services,
        hosts or containers.
        Display the response in tabular format if appropriate.
      `,
      descriptionForUser: 'Get alerts for Observability',
      parameters: {
        type: 'object',
        properties: {
          start: {
            type: 'string',
            description: 'The start of the time range, in Elasticsearch date math, like `now`.',
          },
          end: {
            type: 'string',
            description: 'The end of the time range, in Elasticsearch date math, like `now-24h`.',
          },
          kqlFilter: {
            type: 'string',
            description: `Filter alerts by field:value pairs`,
          },
          includeRecovered: {
            type: 'boolean',
            description:
              'Whether to include recovered/closed alerts. Defaults to false, which means only active alerts will be returned',
          },
        },
        required: ['start', 'end'],
      } as const,
    },
    async (
      { arguments: { start: startAsDatemath, end: endAsDatemath, filter, includeRecovered } },
      signal
    ) => {
      const alertsClient = await pluginsStart.ruleRegistry.getRacClientWithRequest(
        resources.request as KibanaRequest
      );

      const start = datemath.parse(startAsDatemath)!.valueOf();
      const end = datemath.parse(endAsDatemath)!.valueOf();

      const kqlQuery = !filter ? [] : [toElasticsearchQuery(fromKueryExpression(filter))];

      const response = await alertsClient.find({
        featureIds: DEFAULT_FEATURE_IDS as unknown as string[],
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
        size: 10,
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
    ['observability']
  );
}

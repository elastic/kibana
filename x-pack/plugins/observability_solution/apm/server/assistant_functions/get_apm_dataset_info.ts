/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionVisibility } from '@kbn/observability-ai-assistant-plugin/common';
import { compact, mapValues, omit, uniq } from 'lodash';
import datemath from '@elastic/datemath';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { getTypedSearch } from '../utils/create_typed_es_client';
import type { FunctionRegistrationParameters } from '.';

export function registerGetApmDatasetInfoFunction({
  apmEventClient,
  registerFunction,
  resources,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'get_apm_dataset_info',
      visibility: FunctionVisibility.AssistantOnly,
      description: `Use this function to get information about APM data.`,
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
      { arguments: { start, end } },
      signal
    ): Promise<{
      content: {
        fields: string[];
        description: string;
      };
    }> => {
      const indices = omit(apmEventClient.indices, 'sourcemap', 'onboarding');

      const allIndices = uniq(
        Object.values(indices)
          .flatMap((indicesForEvent) => indicesForEvent.split(','))
          .map((index) => index.trim())
      );

      const search = getTypedSearch(
        (await resources.context.core).elasticsearch.client.asCurrentUser
      );

      const startInMs = datemath.parse(start ?? 'now-24h')!.valueOf();
      const endInMs = datemath.parse(end ?? 'now')!.valueOf();

      const indicesWithData = compact(
        await Promise.all(
          allIndices.map(async (index) => {
            const response = await search({
              index,
              size: 0,
              track_total_hits: 1,
              terminate_after: 1,
              query: {
                bool: {
                  filter: [...rangeQuery(startInMs, endInMs)],
                },
              },
            });

            return response.hits.total &&
              typeof response.hits.total !== 'number' &&
              response.hits.total.value > 0
              ? index
              : undefined;
          })
        )
      );

      const availableIndices = mapValues(indices, (indicesForEvent) => {
        return uniq(
          indicesForEvent
            .split(',')
            .map((index) => index.trim())
            .filter((index) => indicesWithData.includes(index))
        );
      });

      if (!Object.values(availableIndices).flat().length) {
        return {
          content: {
            fields: [],
            description: 'There is no APM data available',
          },
        };
      }

      return {
        content: {
          fields: [
            'agent.name:keyword',
            'agent.version:keyword',
            'service.name:keyword',
            'service.environment:keyword',
            'service.node.name:keyword',
            'service.version:keyword',
            'host.name:keyword',
            'transaction.name:keyword',
            'event.outcome:keyword',
            'user_agent.original:keyword',
            'transaction.duration.us:number',
            'transaction.type:keyword',
            'span.duration.us:number',
            'span.type:keyword',
            'span.subtype:keyword',
            'span.name:keyword',
            'span.destination.service.resource:keyword',
            'error.grouping_name:keyword',
            'metricset.name',
            'container.id:keyword',
            'kubernetes.pod.name:keyword',
            'client.geo.country_iso_code:keyword',
            '@timestamp:date',
            'message:text',
          ],
          description: `Elastic APM collects different types of data: transactions, spans, errors, logs and metrics.

          All events have service.name, service.environment, agent.name, agent.version, service.version, service.node.name.

          When generating an ES|QL query, you MUST use one of the indices mentioned below for the \`FROM\` command.

          For transactions, query the transactions index (${availableIndices.transaction.join(
            ','
          )}) and filter where \`processor.event\` is "transaction".
          Transactions have transaction.type, transaction.name, event.outcome (success, failure, unknown).

          For spans, query the spans index (${availableIndices.span.join(
            ','
          )}) and filter where \`processor.event\` is "span".
          Spans have span.name, span.type, span.subtype, and optionally span.destination.service.resource.

          For errors, query the errors index (${availableIndices.error.join(
            ','
          )}) and filter where processor.event is "error".
          Errors have error.grouping_name and possibly transaction metadata.

          For metrics, query the metrics index (${availableIndices.metric.join(
            ','
          )}) and filter where \`metricset.name\` is "app".

          For logs, query the logs index (${availableIndices.error.join(',')}).

          If you need other fields, like custom metrics, or custom labels, follow this up with the get_dataset_info function,
          restricted to the indices returned from this function.
          `,
        },
      };
    },
    ['observability']
  );
}

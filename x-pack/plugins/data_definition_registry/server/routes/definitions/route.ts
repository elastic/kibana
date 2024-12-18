/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { ChatCompletionEventType, ChatCompletionMessageEvent } from '@kbn/inference-common';
import { correctCommonEsqlMistakes, extractEsqlQueries } from '@kbn/inference-plugin/common';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { ServerSentEventBase } from '@kbn/sse-utils';
import { z } from '@kbn/zod';
import { Observable, filter, of, switchMap } from 'rxjs';
import { badRequest } from '@hapi/boom';
import type { DynamicDataAsset, EsqlQueryDefinition } from '../../data_definition_registry/types';
import { createDataDefinitionRegistryServerRoute } from '../create_data_definition_registry_server_route';

function relativeOrAbsolute(options?: { roundUp?: boolean }) {
  return z.union([z.string(), z.number()]).transform((value, context) => {
    if (typeof value === 'string') {
      const parsed = datemath.parse(value, { roundUp: options?.roundUp ?? false })?.valueOf();
      if (!parsed) {
        throw new Error(`Failed to parse date ${value}`);
      }
      return parsed;
    }
    return value;
  });
}

function getQueryDsl({
  start,
  end,
  index,
  kuery,
}: {
  start: number;
  end: number;
  index?: string | string[];
  kuery?: string;
}) {
  return {
    start,
    end,
    index: index ?? ['*', '*:*'],
    query: {
      bool: {
        filter: [
          kuery ? { kql: { query: kuery } } : { match_all: {} },
          {
            range: {
              '@timestamp': {
                gte: start,
                lte: end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
  };
}

const baseSchema = z.object({
  start: relativeOrAbsolute(),
  end: relativeOrAbsolute({ roundUp: true }),
  kuery: z.string().optional(),
  index: z.union([z.string(), z.array(z.string())]).optional(),
});

const getAssetsRoute = createDataDefinitionRegistryServerRoute({
  endpoint: 'GET /internal/data_definition/assets',
  params: z.object({
    query: baseSchema,
  }),
  options: {
    tags: ['access:dataDefinitionRegistry'],
  },
  handler: async ({ params, registry, request }): Promise<{ assets: DynamicDataAsset[] }> => {
    const client = await registry.getClientWithRequest(request);

    const {
      query: { start, end, index, kuery },
    } = params;

    return {
      assets: await client.getAssets(getQueryDsl({ start, end, index, kuery })),
    };
  },
});

const getQueriesRoute = createDataDefinitionRegistryServerRoute({
  endpoint: 'GET /internal/data_definition/queries',
  params: z.object({
    query: baseSchema,
  }),
  options: {
    tags: ['access:dataDefinitionRegistry'],
  },
  handler: async ({ params, registry, request }): Promise<{ queries: EsqlQueryDefinition[] }> => {
    const client = await registry.getClientWithRequest(request);

    const {
      query: { start, end, index, kuery },
    } = params;

    const queries = await client.getQueries(getQueryDsl({ start, end, index, kuery }));

    return { queries };
  },
});

const suggestQueryRoute = createDataDefinitionRegistryServerRoute({
  endpoint: 'GET /internal/data_definition/suggest_query',
  params: z.object({
    query: z.intersection(
      baseSchema,
      z.object({
        query: z.string(),
        connectorId: z.string().optional(),
      })
    ),
  }),
  options: {
    tags: ['access:dataDefinitionRegistry'],
  },
  handler: async ({
    params,
    registry,
    request,
    plugins,
    logger,
  }): Promise<
    Observable<
      ServerSentEventBase<
        'query',
        {
          output: string;
        }
      >
    >
  > => {
    const [registryClient, inferenceClient] = await Promise.all([
      registry.getClientWithRequest(request),
      plugins.inference.start().then((inferenceStart) => inferenceStart.getClient({ request })),
    ]);

    const {
      query: { start, end, index, kuery, query, connectorId: givenConnectorId },
    } = params;

    const queries = await registryClient.getQueries(getQueryDsl({ start, end, index, kuery }));

    let connectorId = givenConnectorId;

    if (!connectorId) {
      connectorId = await inferenceClient.getConnectors().then((connectors) => {
        return connectors.length ? connectors[0].connectorId : undefined;
      });
    }

    if (!connectorId) {
      throw badRequest(`No connector given and no other connector found`);
    }

    function generateQuery(errors: string[]): Observable<
      ServerSentEventBase<
        'query',
        {
          output: string;
        }
      >
    > {
      return naturalLanguageToEsql({
        client: inferenceClient,
        connectorId: connectorId!,
        logger,
        input: `The user is editing a query in Discover. They have asked for
            the query to be auto-completed. Your task is to write a query based
            on the current text in the editor. "//" denotes a comment. The first
            query wrapped in \`\`\`esql \`\`\` ticks will replace the existing
            query in the editor.

            The current query is:
            \`\`\`esql
            ${query}
            \`\`\`

            ${
              queries.length
                ? `The following queries are relevant to the existing
            set of filters and time range:

            ${queries.map(({ id, description, query: definitionQuery }) => {
              return `- ${id}: ${description}
                \`\`\`esql
                ${definitionQuery}
                \`\`\`
              `;
            })}`
                : ''
            }
            
            ${
              errors.length
                ? `Previously, the following errors were encountered:
            
            ${errors.join('\n\n')}`
                : ''
            }`,
      }).pipe(
        filter((event): event is ChatCompletionMessageEvent => {
          return event.type === ChatCompletionEventType.ChatCompletionMessage;
        }),
        switchMap((event) => {
          const generatedQuery: string | undefined = extractEsqlQueries(event.content)[0];

          if (!generatedQuery) {
            return of();
          }

          const { output } = correctCommonEsqlMistakes(generatedQuery);

          return of({ type: 'query' as const, output });
        })
      );
    }

    return generateQuery([]);
  },
});

export const definitionsRoutes = {
  ...getAssetsRoute,
  ...getQueriesRoute,
  ...suggestQueryRoute,
};

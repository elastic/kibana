/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { sendMessageEvent, SendMessageEventData } from './analytics/events';
import { fetchFields } from './lib/fetch_query_source_fields';
import { AssistClientOptionsWithClient, createAssist as Assist } from './utils/assist';
import { ConversationalChain } from './lib/conversational_chain';
import { errorHandler } from './utils/error_handler';
import { handleStreamResponse } from './utils/handle_stream_response';
import {
  APIRoutes,
  SearchPlaygroundPluginStart,
  SearchPlaygroundPluginStartDependencies,
} from './types';
import { getChatParams } from './lib/get_chat_params';
import { fetchIndices } from './lib/fetch_indices';
import { isNotNullish } from '../common/is_not_nullish';

export function createRetriever(esQuery: string) {
  return (question: string) => {
    try {
      const replacedQuery = esQuery.replace(/{query}/g, question.replace(/"/g, '\\"'));
      const query = JSON.parse(replacedQuery);
      return query;
    } catch (e) {
      throw Error(e);
    }
  };
}

export function defineRoutes({
  logger,
  router,
  getStartServices,
}: {
  logger: Logger;
  router: IRouter;
  getStartServices: StartServicesAccessor<
    SearchPlaygroundPluginStartDependencies,
    SearchPlaygroundPluginStart
  >;
}) {
  router.post(
    {
      path: APIRoutes.POST_QUERY_SOURCE_FIELDS,
      validate: {
        body: schema.object({
          indices: schema.arrayOf(schema.string()),
        }),
      },
    },
    errorHandler(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      const { indices } = request.body;

      const fields = await fetchFields(client, indices);

      return response.ok({
        body: fields,
      });
    })
  );

  router.post(
    {
      path: APIRoutes.POST_CHAT_MESSAGE,
      validate: {
        body: schema.object({
          data: schema.object({
            connector_id: schema.string(),
            indices: schema.string(),
            prompt: schema.string(),
            citations: schema.boolean(),
            elasticsearch_query: schema.string(),
            summarization_model: schema.maybe(schema.string()),
            doc_size: schema.number(),
            source_fields: schema.string(),
          }),
          messages: schema.any(),
        }),
      },
    },
    errorHandler(async (context, request, response) => {
      const [{ analytics }, { actions }] = await getStartServices();
      const { client } = (await context.core).elasticsearch;
      const aiClient = Assist({
        es_client: client.asCurrentUser,
      } as AssistClientOptionsWithClient);
      const { messages, data } = await request.body;
      const { chatModel, chatPrompt, connector } = await getChatParams(
        {
          connectorId: data.connector_id,
          model: data.summarization_model,
          citations: data.citations,
          prompt: data.prompt,
        },
        { actions, logger, request }
      );

      let sourceFields = {};

      try {
        sourceFields = JSON.parse(data.source_fields);
        sourceFields = Object.keys(sourceFields).reduce((acc, key) => {
          // @ts-ignore
          acc[key] = sourceFields[key][0];
          return acc;
        }, {});
      } catch (e) {
        logger.error('Failed to parse the source fields', e);
        throw Error(e);
      }

      const chain = ConversationalChain({
        model: chatModel,
        rag: {
          index: data.indices,
          retriever: createRetriever(data.elasticsearch_query),
          content_field: sourceFields,
          size: Number(data.doc_size),
        },
        prompt: chatPrompt,
      });

      let stream: ReadableStream<Uint8Array>;

      try {
        stream = await chain.stream(aiClient, messages);
      } catch (e) {
        logger.error('Failed to create the chat stream', e);

        if (typeof e === 'object') {
          return response.badRequest({
            body: {
              message: e.message,
            },
          });
        }

        throw e;
      }

      analytics.reportEvent<SendMessageEventData>(sendMessageEvent.eventType, {
        connectorType:
          connector.actionTypeId +
          (connector.config?.apiProvider ? `-${connector.config.apiProvider}` : ''),
        model: data.summarization_model ?? '',
        isCitationsEnabled: data.citations,
      });

      return handleStreamResponse({ logger, stream, response, request });
    })
  );

  router.post(
    {
      path: APIRoutes.POST_API_KEY,
      validate: {
        body: schema.object({
          name: schema.string(),
          expiresInDays: schema.number(),
          indices: schema.arrayOf(schema.string()),
        }),
      },
    },
    errorHandler(async (context, request, response) => {
      const { name, expiresInDays, indices } = request.body;
      const { client } = (await context.core).elasticsearch;

      const apiKey = await client.asCurrentUser.security.createApiKey({
        name,
        expiration: `${expiresInDays}d`,
        role_descriptors: {
          [`playground-${name}-role`]: {
            cluster: [],
            indices: [
              {
                names: indices,
                privileges: ['read'],
              },
            ],
          },
        },
      });

      return response.ok({
        body: { apiKey },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  // SECURITY: We don't apply any authorization tags to this route because all actions performed
  // on behalf of the user making the request and governed by the user's own cluster privileges.
  router.get(
    {
      path: APIRoutes.GET_INDICES,
      validate: {
        query: schema.object({
          search_query: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 10, min: 0 }),
        }),
      },
    },
    errorHandler(async (context, request, response) => {
      const { search_query: searchQuery, size } = request.query;
      const {
        client: { asCurrentUser },
      } = (await context.core).elasticsearch;

      const { indexNames } = await fetchIndices(asCurrentUser, searchQuery);

      const indexNameSlice = indexNames.slice(0, size).filter(isNotNullish);

      return response.ok({
        body: {
          indices: indexNameSlice,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}

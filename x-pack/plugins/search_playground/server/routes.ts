/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { streamFactory } from '@kbn/ml-response-stream/server';
import { Logger } from '@kbn/core/server';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { fetchFields } from './utils/fetch_query_source_fields';
import { AssistClientOptionsWithClient, createAssist as Assist } from './utils/assist';
import { ConversationalChain } from './utils/conversational_chain';
import { errorHandler } from './utils/error_handler';
import {
  APIRoutes,
  SearchPlaygroundPluginStart,
  SearchPlaygroundPluginStartDependencies,
} from './types';
import { getChatParams } from './utils/get_chat_params';

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
      const [, { actions }] = await getStartServices();
      const { client } = (await context.core).elasticsearch;
      try {
        const aiClient = Assist({
          es_client: client.asCurrentUser,
        } as AssistClientOptionsWithClient);
        const { messages, data } = await request.body;
        const { chatModel, chatPrompt } = await getChatParams(
          {
            connectorId: data.connector_id,
            model: data.summarization_model,
            citations: data.citations,
            prompt: data.prompt,
          },
          { actions, logger, request }
        );

        let sourceFields;

        try {
          sourceFields = JSON.parse(data.source_fields);
        } catch (e) {
          logger.error('Failed to parse the source fields', e);
          throw Error(e);
        }

        const chain = ConversationalChain({
          model: chatModel,
          prompt: chatPrompt,
          rag: {
            index: data.indices,
            retriever: createRetriever(data.elasticsearch_query),
            content_field: sourceFields,
            size: Number(data.doc_size),
          },
        });

        const stream = await chain.stream(aiClient, messages);
        const { end, push, responseWithHeaders } = streamFactory(request.headers, logger);
        const reader = (stream as ReadableStream).getReader();
        const textDecoder = new TextDecoder();

        async function pushStreamUpdate() {
          reader.read().then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
            if (done) {
              end();
              return;
            }
            push(textDecoder.decode(value));
            pushStreamUpdate();
          });
        }

        pushStreamUpdate();

        return response.ok(responseWithHeaders);
      } catch (e) {
        logger.error('Failed to create the chat stream', e);

        throw Error(e);
      }
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
}

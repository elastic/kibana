/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ChatOpenAI } from '@langchain/openai';
import { streamFactory } from '@kbn/ml-response-stream/server';
import { Logger } from '@kbn/logging';
import { IRouter } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { fetchFields } from './utils/fetch_query_source_fields';
import { AssistClientOptionsWithClient, createAssist as Assist } from './utils/assist';
import { ConversationalChain } from './utils/conversational_chain';
import { Prompt } from './utils/prompt';
import { errorHandler } from './utils/error_handler';
import { APIRoutes, ErrorCode } from './types';
import { createError, SearchPlaygroundError } from './utils/create_error';
import { isInvalidApiKeyException } from './utils/exceptions';

export function defineRoutes({ log, router }: { log: Logger; router: IRouter }) {
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
          data: schema.any(),
          messages: schema.any(),
        }),
      },
    },
    errorHandler(async (context, request, response) => {
      try {
        const { client } = (await context.core).elasticsearch;

        const aiClient = Assist({
          es_client: client.asCurrentUser,
        } as AssistClientOptionsWithClient);

        const { messages, data } = await request.body;

        const model = new ChatOpenAI({
          openAIApiKey: data.api_key,
        });

        let sourceFields = {};

        sourceFields = JSON.parse(data.source_fields);

        const chain = ConversationalChain({
          model,
          rag: {
            index: data.indices,
            retriever: (question: string) => {
              try {
                const query = JSON.parse(data.elasticsearchQuery.replace(/{query}/g, question));
                return query.query;
              } catch (e) {
                log.error('Failed to parse the Elasticsearch query', e);
                throw Error(e);
              }
            },
            content_field: sourceFields,
            size: Number(data.docSize),
          },
          prompt: Prompt(data.prompt, {
            citations: data.citations,
            context: true,
            type: 'openai',
          }),
        });

        const stream = await chain.stream(aiClient, messages);

        const { end, push, responseWithHeaders } = streamFactory(request.headers, log);

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
      } catch (error) {
        if (isInvalidApiKeyException(error)) {
          return createError({
            errorCode: ErrorCode.INVALID_API_KEY,
            message: i18n.translate('xpack.searchPlayground.server.routes.invalidApiKeyError', {
              defaultMessage: 'Incorrect API key provided',
            }),
            response,
            statusCode: 403,
          });
        } else {
          return createError({
            errorCode: ErrorCode.UNCAUGHT_EXCEPTION,
            message: i18n.translate('xpack.searchPlayground.server.routes.uncaughtExceptionError', {
              defaultMessage: 'Playground encountered an error.',
            }),
            response,
            statusCode: 502,
          });
        }
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

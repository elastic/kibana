/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Stream from 'stream';

import Assist, { ConversationalChain } from '@elastic/ai-assist';

import { Prompt } from '@elastic/ai-assist';
import { ChatOpenAI } from '@elastic/ai-assist/models';
import { fetchFields } from '@kbn/ai-playground/lib/fetch_query_source_fields';
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerAIPlaygroundRoutes({ log, router }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/ai_playground/query_source_fields',
      validate: {
        body: schema.object({
          indices: schema.arrayOf(schema.string()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
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
      path: '/internal/enterprise_search/ai_playground/chat',
      validate: {
        body: schema.object({
          data: schema.any(),
          messages: schema.any(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      const aiClient = Assist({
        es_client: client.asCurrentUser,
      });

      const { messages, data } = await request.body;

      const model = new ChatOpenAI({
        openAIApiKey: data.api_key,
      });

      const chain = ConversationalChain({
        model,
        rag: {
          index: data.indices,
          retriever: (question: string) => {
            return {
              text_expansion: {
                'vector.tokens': {
                  model_id: '.elser_model_2',
                  model_text: question,
                },
              },
            };
          },
        },
        prompt: Prompt(data.prompt, {
          citations: data.citations,
          context: true,
          type: 'openai',
        }),
      });

      const stream = await chain.stream(aiClient, messages);

      const reader = (stream as ReadableStream).getReader();

      class UIStream extends Stream.Readable {
        _read() {
          const that = this;

          function read() {
            reader.read().then(({ done, value }: { done: boolean; value?: string }) => {
              if (done) {
                that.push(null);
                return;
              }
              that.push(value);
              read();
            });
          }
          read();
        }
      }

      return response.custom({
        body: new UIStream(),
        statusCode: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    })
  );
}

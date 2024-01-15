/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import type OpenAI from 'openai';
import { Readable } from 'stream';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { messageRt } from '../runtime_types';

const chatRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.intersection([
    t.type({
      body: t.intersection([
        t.type({
          messages: t.array(messageRt),
          connectorId: t.string,
          functions: t.array(
            t.type({
              name: t.string,
              description: t.string,
              parameters: t.any,
            })
          ),
        }),
        t.partial({
          functionCall: t.string,
        }),
      ]),
    }),
    t.partial({ query: t.type({ stream: toBooleanRt }) }),
  ]),
  handler: async (resources): Promise<Readable | OpenAI.ChatCompletion> => {
    const { request, params, service } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    const {
      body: { messages, connectorId, functions, functionCall },
      query = { stream: true },
    } = params;

    const stream = query.stream;

    const controller = new AbortController();

    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    return client.chat({
      messages,
      connectorId,
      stream,
      signal: controller.signal,
      ...(functions.length
        ? {
            functions,
            functionCall,
          }
        : {}),
    });
  },
});

const chatCompleteRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.type({
    body: t.intersection([
      t.type({
        messages: t.array(messageRt),
        connectorId: t.string,
        persist: toBooleanRt,
      }),
      t.partial({
        conversationId: t.string,
        title: t.string,
      }),
    ]),
  }),
  handler: async (resources): Promise<Readable | OpenAI.Chat.ChatCompletion> => {
    const { request, params, service } = resources;

    const client = await service.getClient({ request });

    if (!client) {
      throw notImplemented();
    }

    const {
      body: { messages, connectorId, conversationId, title, persist },
    } = params;

    const controller = new AbortController();

    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const functionClient = await service.getFunctionClient({
      signal: controller.signal,
      resources,
      client,
    });

    return client.complete({
      messages,
      connectorId,
      conversationId,
      title,
      persist,
      signal: controller.signal,
      functionClient,
    });
  },
});

export const chatRoutes = {
  ...chatRoute,
  ...chatCompleteRoute,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import { toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { Readable } from 'stream';
import { flushBuffer } from '../../service/util/flush_buffer';
import { observableIntoStream } from '../../service/util/observable_into_stream';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { screenContextRt, messageRt } from '../runtime_types';

const chatRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.type({
    body: t.intersection([
      t.type({
        name: t.string,
        messages: t.array(messageRt),
        connectorId: t.string,
        functions: t.array(
          t.intersection([
            t.type({
              name: t.string,
              description: t.string,
            }),
            t.partial({
              parameters: t.any,
            }),
          ])
        ),
      }),
      t.partial({
        functionCall: t.string,
      }),
    ]),
  }),
  handler: async (resources): Promise<Readable> => {
    const { request, params, service } = resources;

    const [client, cloudStart] = await Promise.all([
      service.getClient({ request }),
      resources.plugins.cloud?.start(),
    ]);

    if (!client) {
      throw notImplemented();
    }

    const {
      body: { name, messages, connectorId, functions, functionCall },
    } = params;

    const controller = new AbortController();

    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const response$ = await client.chat(name, {
      messages,
      connectorId,
      signal: controller.signal,
      ...(functions.length
        ? {
            functions,
            functionCall,
          }
        : {}),
    });

    return observableIntoStream(response$.pipe(flushBuffer(!!cloudStart?.isCloudEnabled)));
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
        screenContexts: t.array(screenContextRt),
        connectorId: t.string,
        persist: toBooleanRt,
      }),
      t.partial({
        conversationId: t.string,
        title: t.string,
        responseLanguage: t.string,
        instructions: t.array(
          t.union([
            t.string,
            t.type({
              doc_id: t.string,
              text: t.string,
            }),
          ])
        ),
      }),
    ]),
  }),
  handler: async (resources): Promise<Readable> => {
    const { request, params, service } = resources;

    const [client, cloudStart] = await Promise.all([
      service.getClient({ request }),
      resources.plugins.cloud?.start() || Promise.resolve(undefined),
    ]);

    if (!client) {
      throw notImplemented();
    }

    const {
      body: {
        messages,
        connectorId,
        conversationId,
        title,
        persist,
        screenContexts,
        responseLanguage,
        instructions,
      },
    } = params;

    const controller = new AbortController();

    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const functionClient = await service.getFunctionClient({
      signal: controller.signal,
      resources,
      client,
      screenContexts,
    });

    const response$ = client.complete({
      messages,
      connectorId,
      conversationId,
      title,
      persist,
      signal: controller.signal,
      functionClient,
      responseLanguage,
      instructions,
    });

    return observableIntoStream(response$.pipe(flushBuffer(!!cloudStart?.isCloudEnabled)));
  },
});

export const chatRoutes = {
  ...chatRoute,
  ...chatCompleteRoute,
};

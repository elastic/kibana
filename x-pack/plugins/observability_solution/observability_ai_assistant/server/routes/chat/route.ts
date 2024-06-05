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
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { KibanaRequest } from '@kbn/core/server';
import { context as otelContext } from '@opentelemetry/api';
import { aiAssistantSimulatedFunctionCalling } from '../..';
import { flushBuffer } from '../../service/util/flush_buffer';
import { observableIntoOpenAIStream } from '../../service/util/observable_into_openai_stream';
import { observableIntoStream } from '../../service/util/observable_into_stream';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { screenContextRt, messageRt, functionRt } from '../runtime_types';
import { ObservabilityAIAssistantRouteHandlerResources } from '../types';
import { withAssistantSpan } from '../../service/util/with_assistant_span';
import { LangTracer } from '../../service/client/instrumentation/lang_tracer';

const chatCompleteBaseRt = t.type({
  body: t.intersection([
    t.type({
      messages: t.array(messageRt),
      connectorId: t.string,
      persist: toBooleanRt,
    }),
    t.partial({
      conversationId: t.string,
      title: t.string,
      responseLanguage: t.string,
      disableFunctions: toBooleanRt,
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
});

const chatCompleteInternalRt = t.intersection([
  chatCompleteBaseRt,
  t.type({
    body: t.type({
      screenContexts: t.array(screenContextRt),
    }),
  }),
]);

const chatCompletePublicRt = t.intersection([
  chatCompleteBaseRt,
  t.partial({
    body: t.partial({
      actions: t.array(functionRt),
    }),
    query: t.partial({
      format: t.union([t.literal('default'), t.literal('openai')]),
    }),
  }),
]);

async function guardAgainstInvalidConnector({
  actions,
  request,
  connectorId,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
}) {
  return withAssistantSpan('guard_against_invalid_connector', async () => {
    const actionsClient = await actions.getActionsClientWithRequest(request);

    const connector = await actionsClient.get({
      id: connectorId,
      throwIfSystemAction: true,
    });

    return connector;
  });
}

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
        functions: t.array(functionRt),
      }),
      t.partial({
        functionCall: t.string,
      }),
    ]),
  }),
  handler: async (resources): Promise<Readable> => {
    const { request, params, service, context, plugins } = resources;

    const {
      body: { name, messages, connectorId, functions, functionCall },
    } = params;

    await guardAgainstInvalidConnector({
      actions: await plugins.actions.start(),
      request,
      connectorId,
    });

    const [client, cloudStart, simulateFunctionCalling] = await Promise.all([
      service.getClient({ request }),
      resources.plugins.cloud?.start(),
      (await context.core).uiSettings.client.get<boolean>(aiAssistantSimulatedFunctionCalling),
    ]);

    if (!client) {
      throw notImplemented();
    }

    const controller = new AbortController();

    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const response$ = client.chat(name, {
      messages,
      connectorId,
      signal: controller.signal,
      ...(functions.length
        ? {
            functions,
            functionCall,
          }
        : {}),
      simulateFunctionCalling,
      tracer: new LangTracer(otelContext.active()),
    });

    return observableIntoStream(response$.pipe(flushBuffer(!!cloudStart?.isCloudEnabled)));
  },
});

async function chatComplete(
  resources: ObservabilityAIAssistantRouteHandlerResources & {
    params: t.TypeOf<typeof chatCompleteInternalRt>;
  }
) {
  const { request, params, service, plugins } = resources;

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
      disableFunctions,
    },
  } = params;

  await guardAgainstInvalidConnector({
    actions: await plugins.actions.start(),
    request,
    connectorId,
  });

  const [client, cloudStart, simulateFunctionCalling] = await Promise.all([
    service.getClient({ request }),
    resources.plugins.cloud?.start() || Promise.resolve(undefined),
    (
      await resources.context.core
    ).uiSettings.client.get<boolean>(aiAssistantSimulatedFunctionCalling),
  ]);

  if (!client) {
    throw notImplemented();
  }

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
    simulateFunctionCalling,
    disableFunctions,
  });

  return response$.pipe(flushBuffer(!!cloudStart?.isCloudEnabled));
}

const chatCompleteRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: chatCompleteInternalRt,
  handler: async (resources): Promise<Readable> => {
    return observableIntoStream(await chatComplete(resources));
  },
});

const publicChatCompleteRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /api/observability_ai_assistant/chat/complete 2023-10-31',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: chatCompletePublicRt,
  handler: async (resources): Promise<Readable> => {
    const { params, logger } = resources;

    const {
      body: { actions, ...restOfBody },
      query = {},
    } = params;

    const { format = 'default' } = query;

    const response$ = await chatComplete({
      ...resources,
      params: {
        body: {
          ...restOfBody,
          screenContexts: [
            {
              actions,
            },
          ],
        },
      },
    });

    return format === 'openai'
      ? observableIntoOpenAIStream(response$, logger)
      : observableIntoStream(response$);
  },
});

export const chatRoutes = {
  ...chatRoute,
  ...chatCompleteRoute,
  ...publicChatCompleteRoute,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, Type } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import { MessageRole } from '../../common/chat_complete';
import type { ChatCompleteRequestBody } from '../../common/chat_complete/request';
import { ToolCall, ToolChoiceType } from '../../common/chat_complete/tools';
import { createInferenceClient } from '../inference_client';
import { InferenceServerStart, InferenceStartDependencies } from '../types';
import { observableIntoEventSourceStream } from '../util/observable_into_event_source_stream';

const toolCallSchema: Type<ToolCall[]> = schema.arrayOf(
  schema.object({
    toolCallId: schema.string(),
    function: schema.object({
      name: schema.string(),
      arguments: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    }),
  })
);

const chatCompleteBodySchema: Type<ChatCompleteRequestBody> = schema.object({
  connectorId: schema.string(),
  system: schema.maybe(schema.string()),
  tools: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        description: schema.string(),
        schema: schema.maybe(
          schema.object({
            type: schema.literal('object'),
            properties: schema.recordOf(schema.string(), schema.any()),
            required: schema.maybe(schema.arrayOf(schema.string())),
          })
        ),
      })
    )
  ),
  toolChoice: schema.maybe(
    schema.oneOf([
      schema.literal(ToolChoiceType.auto),
      schema.literal(ToolChoiceType.none),
      schema.literal(ToolChoiceType.required),
      schema.object({
        function: schema.string(),
      }),
    ])
  ),
  messages: schema.arrayOf(
    schema.oneOf([
      schema.object({
        role: schema.literal(MessageRole.Assistant),
        content: schema.oneOf([schema.string(), schema.literal(null)]),
        toolCalls: schema.maybe(toolCallSchema),
      }),
      schema.object({
        role: schema.literal(MessageRole.User),
        content: schema.string(),
        name: schema.maybe(schema.string()),
      }),
      schema.object({
        role: schema.literal(MessageRole.Tool),
        toolCallId: schema.string(),
        response: schema.recordOf(schema.string(), schema.any()),
      }),
    ])
  ),
  functionCalling: schema.maybe(
    schema.oneOf([schema.literal('native'), schema.literal('simulated')])
  ),
});

export function registerChatCompleteRoute({
  coreSetup,
  router,
  logger,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
  logger: Logger;
}) {
  router.post(
    {
      path: '/internal/inference/chat_complete',
      validate: {
        body: chatCompleteBodySchema,
      },
    },
    async (context, request, response) => {
      const actions = await coreSetup
        .getStartServices()
        .then(([coreStart, pluginsStart]) => pluginsStart.actions);

      const client = createInferenceClient({ request, actions, logger });

      const { connectorId, messages, system, toolChoice, tools, functionCalling } = request.body;

      const chatCompleteResponse = client.chatComplete({
        connectorId,
        messages,
        system,
        toolChoice,
        tools,
        functionCalling,
      });

      return response.ok({
        body: observableIntoEventSourceStream(chatCompleteResponse, logger),
      });
    }
  );
}

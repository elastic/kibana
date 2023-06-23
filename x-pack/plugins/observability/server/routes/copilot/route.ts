/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { ServerRoute } from '@kbn/server-route-repository';
import axios from 'axios';
import * as t from 'io-ts';
import { map } from 'lodash';
import { ChatCompletionRequestMessageRoleEnum, CreateChatCompletionResponse } from 'openai';
import { Readable } from 'stream';
import { CoPilotPromptMap, coPilotPrompts } from '../../../common/co_pilot';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import { ObservabilityRouteCreateOptions, ObservabilityRouteHandlerResources } from '../types';

const promptRoutes: {
  [TPromptId in keyof CoPilotPromptMap as `POST /internal/observability/copilot/prompts/${TPromptId}`]: ServerRoute<
    `POST /internal/observability/copilot/prompts/${TPromptId}`,
    t.TypeC<{ body: CoPilotPromptMap[TPromptId]['params'] }>,
    ObservabilityRouteHandlerResources,
    unknown,
    ObservabilityRouteCreateOptions
  >;
} = Object.assign(
  {},
  ...map(coPilotPrompts, (prompt, promptId) => {
    return createObservabilityServerRoute({
      endpoint: `POST /internal/observability/copilot/prompts/${promptId}`,
      params: t.type({
        body: prompt.params,
      }),
      options: {
        tags: [],
      },
      handler: async (resources): Promise<CreateChatCompletionResponse | Readable> => {
        const client = resources.dependencies.getOpenAIClient();

        if (!client) {
          throw Boom.notImplemented();
        }

        return client.chatCompletion.create(prompt.messages(resources.params.body as any));
      },
    });
  })
);

const feedbackRoute = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/copilot/prompts/{promptId}/feedback',
  params: t.type({
    path: t.type({
      promptId: t.string,
    }),
    body: t.type({
      positive: t.boolean,
      responseTime: t.number,
      messages: t.array(
        t.intersection([
          t.type({
            role: t.union([
              t.literal(ChatCompletionRequestMessageRoleEnum.System),
              t.literal(ChatCompletionRequestMessageRoleEnum.User),
              t.literal(ChatCompletionRequestMessageRoleEnum.Assistant),
            ]),
            content: t.string,
          }),
          t.partial({
            name: t.string,
          }),
        ])
      ),
      response: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  handler: async (resources): Promise<void> => {
    const { params, config } = resources;

    if (!config.aiAssistant?.enabled) {
      throw Boom.notImplemented;
    }

    const deploymentId = resources.dependencies.pluginsSetup.cloud?.deploymentId || 'local';

    const feedbackBody = {
      cluster_id: deploymentId,
      prompt_name: params.path.promptId,
      feedback_action: params.body.positive ? 'thumbsup' : 'thumbsdown',
      model:
        'openAI' in config.aiAssistant.provider
          ? config.aiAssistant.provider.openAI.model
          : config.aiAssistant.provider.azureOpenAI.resourceName,
      response_time: params.body.responseTime,
      conversation: [
        ...params.body.messages.map(({ role, content }) => ({ role, content })),
        { role: 'system', content: params.body.response },
      ],
    };

    resources.logger.debug(JSON.stringify(feedbackBody));

    await axios.post(config.aiAssistant.feedbackUrl, feedbackBody);
  },
});

export const observabilityCoPilotRouteRepository = {
  ...promptRoutes,
  ...feedbackRoute,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { ServerRoute } from '@kbn/server-route-repository';
import * as t from 'io-ts';
import { map } from 'lodash';
import { CreateChatCompletionResponse } from 'openai';
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

export const observabilityCoPilotRouteRepository = {
  ...promptRoutes,
};

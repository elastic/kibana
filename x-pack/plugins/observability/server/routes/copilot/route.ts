/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { CreateChatCompletionResponse } from 'openai';
import { Readable } from 'stream';
import { OpenAIPromptId, openAiPrompts } from '../../../common/openai';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const promptExplainFunctionRoute = createObservabilityServerRoute({
  endpoint: `POST /internal/observability/copilot/prompts/${OpenAIPromptId.ProfilingExplainFunction}`,
  params: t.type({
    body: openAiPrompts[OpenAIPromptId.ProfilingExplainFunction].params,
  }),
  options: {
    tags: [],
  },
  handler: async (resources): Promise<CreateChatCompletionResponse | Readable> => {
    const client = resources.dependencies.getOpenAIClient();

    if (!client) {
      throw Boom.notImplemented();
    }

    return client.chatCompletion.create(
      openAiPrompts[OpenAIPromptId.ProfilingExplainFunction].messages(resources.params.body)
    );
  },
});

const promptOptimizeFunctionRoute = createObservabilityServerRoute({
  endpoint: `POST /internal/observability/copilot/prompts/${OpenAIPromptId.ProfilingOptimizeFunction}`,
  params: t.type({
    body: openAiPrompts[OpenAIPromptId.ProfilingOptimizeFunction].params,
  }),
  options: {
    tags: [],
  },
  handler: async (resources): Promise<CreateChatCompletionResponse | Readable> => {
    const client = resources.dependencies.getOpenAIClient();

    if (!client) {
      throw Boom.notImplemented();
    }

    return client.chatCompletion.create(
      openAiPrompts[OpenAIPromptId.ProfilingOptimizeFunction].messages(resources.params.body)
    );
  },
});

const promptExplainErrorRoute = createObservabilityServerRoute({
  endpoint: `POST /internal/observability/copilot/prompts/${OpenAIPromptId.ApmExplainError}`,
  params: t.type({
    body: openAiPrompts[OpenAIPromptId.ApmExplainError].params,
  }),
  options: {
    tags: [],
  },
  handler: async (resources): Promise<CreateChatCompletionResponse | Readable> => {
    const client = resources.dependencies.getOpenAIClient();

    if (!client) {
      throw Boom.notImplemented();
    }

    return client.chatCompletion.create(
      openAiPrompts[OpenAIPromptId.ApmExplainError].messages(resources.params.body)
    );
  },
});

export const observabilityCoPilotRouteRepository = {
  ...promptExplainFunctionRoute,
  ...promptOptimizeFunctionRoute,
  ...promptExplainErrorRoute,
};

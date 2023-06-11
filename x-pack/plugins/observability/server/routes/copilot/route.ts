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
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { Readable } from 'stream';
import { toNumberRt } from '@kbn/io-ts-utils';
import {
  CoPilotConversation,
  CoPilotConversationMessage,
  CoPilotPromptMap,
  coPilotPrompts,
} from '../../../common/co_pilot';
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
      handler: async (resources): Promise<Readable> => {
        const client = await resources.dependencies.getCoPilotClient({
          request: resources.request,
        });

        if (!client) {
          throw Boom.notImplemented();
        }

        return client.prompt({ messages: prompt.messages(resources.params.body as any) });
      },
    });
  })
);

const messageRt = t.type({
  role: t.union([
    t.literal(ChatCompletionRequestMessageRoleEnum.Assistant),
    t.literal(ChatCompletionRequestMessageRoleEnum.System),
    t.literal(ChatCompletionRequestMessageRoleEnum.User),
  ]),
  content: t.string,
});

const createConversationRoute = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/copilot/conversation/create',
  options: {
    tags: [],
  },
  handler: async (resources): Promise<{ conversation: CoPilotConversation }> => {
    const client = await resources.dependencies.getCoPilotClient({ request: resources.request });

    if (!client) {
      throw Boom.notImplemented();
    }

    return client.createConversation();
  },
});

const chatRoute = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/copilot/chat',
  params: t.type({
    body: t.type({
      messages: t.array(messageRt),
    }),
  }),
  options: {
    tags: [],
  },
  handler: async (resources): Promise<Readable> => {
    const client = await resources.dependencies.getCoPilotClient({ request: resources.request });

    if (!client) {
      throw Boom.notImplemented();
    }

    return client.chat({
      messages: resources.params.body.messages,
    });
  },
});

const appendRoute = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/copilot/conversation/{conversationId}/append',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
    body: t.type({
      messages: t.array(messageRt),
    }),
  }),
  options: {
    tags: [],
  },
  handler: async (resources): Promise<{ messages: CoPilotConversationMessage[] }> => {
    const client = await resources.dependencies.getCoPilotClient({ request: resources.request });

    if (!client) {
      throw Boom.notImplemented();
    }

    return client.append({
      conversationId: resources.params.path.conversationId,
      messages: resources.params.body.messages,
    });
  },
});

const getConversationRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/copilot/conversation/{conversationId}',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  handler: async (
    resources
  ): Promise<{ conversation: CoPilotConversation; messages: CoPilotConversationMessage[] }> => {
    const client = await resources.dependencies.getCoPilotClient({ request: resources.request });

    if (!client) {
      throw Boom.notImplemented();
    }

    return client.getConversation({
      conversationId: resources.params.path.conversationId,
    });
  },
});

const listConversationsRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/copilot/conversation',
  params: t.type({
    query: t.type({
      size: toNumberRt,
    }),
  }),
  options: {
    tags: [],
  },
  handler: async (resources): Promise<{ conversations: CoPilotConversation[] }> => {
    const client = await resources.dependencies.getCoPilotClient({ request: resources.request });

    if (!client) {
      throw Boom.notImplemented();
    }

    return client.getConversations({
      size: resources.params.query.size,
    });
  },
});

const autoTitleRoute = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/copilot/conversation/{conversationId}/auto_title',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  handler: async (resources) => {
    const client = await resources.dependencies.getCoPilotClient({ request: resources.request });

    if (!client) {
      throw Boom.notImplemented();
    }

    return client.autoTitleConversation({
      conversationId: resources.params.path.conversationId,
    });
  },
});

export const observabilityCoPilotRouteRepository = {
  ...promptRoutes,
  ...createConversationRoute,
  ...chatRoute,
  ...appendRoute,
  ...getConversationRoute,
  ...listConversationsRoute,
  ...autoTitleRoute,
};

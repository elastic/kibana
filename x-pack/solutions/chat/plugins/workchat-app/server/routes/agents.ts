/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  GetAgentResponse,
  ListAgentResponse,
  CreateAgentResponse,
  CreateAgentPayload,
  UpdateAgentResponse,
  DeleteAgentResponse,
} from '../../common/http_api/agents';
import { apiCapabilities } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export const registerAgentRoutes = ({ getServices, router, logger }: RouteDependencies) => {
  const wrapHandler = getHandlerWrapper({ logger });

  // API to get a single agent
  router.get(
    {
      path: '/internal/workchat/agents/{agentId}',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.useWorkchat],
        },
      },
      validate: {
        params: schema.object({
          agentId: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const { agentService } = getServices();
      const client = await agentService.getScopedClient({ request });

      const { agentId } = request.params;

      const agent = await client.get({ agentId });

      return res.ok<GetAgentResponse>({
        body: agent,
      });
    })
  );

  // API to create an agent
  router.post(
    {
      path: '/internal/workchat/agents',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.manageWorkchat],
        },
      },
      validate: {
        body: schema.object({
          name: schema.string(),
          description: schema.string({ defaultValue: '' }),
          configuration: schema.object({
            systemPrompt: schema.maybe(schema.string()),
            useCase: schema.maybe(schema.string()),
          }),
          public: schema.boolean({ defaultValue: false }),
          avatar: schema.object({
            color: schema.maybe(schema.string()),
            text: schema.maybe(schema.string()),
          }),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const payload: CreateAgentPayload = request.body;

      const { agentService } = getServices();
      const client = await agentService.getScopedClient({ request });

      // TODO: validation

      const agent = await client.create(payload);

      return res.ok<CreateAgentResponse>({
        body: {
          success: true,
          agent,
        },
      });
    })
  );

  // API to update an agent
  router.put(
    {
      path: '/internal/workchat/agents/{agentId}',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.manageWorkchat],
        },
      },
      validate: {
        params: schema.object({
          agentId: schema.string(),
        }),
        body: schema.object({
          name: schema.string(),
          description: schema.string({ defaultValue: '' }),
          configuration: schema.object({
            systemPrompt: schema.maybe(schema.string()),
            useCase: schema.maybe(schema.string()),
          }),
          avatar: schema.object({
            color: schema.maybe(schema.string()),
            text: schema.maybe(schema.string()),
          }),
          public: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const { agentId } = request.params;
      const payload: CreateAgentPayload = request.body;

      const { agentService } = getServices();
      const client = await agentService.getScopedClient({ request });

      // TODO: validation

      const agent = await client.update(agentId, payload);

      return res.ok<UpdateAgentResponse>({
        body: {
          success: true,
          agent,
        },
      });
    })
  );

  router.delete(
    {
      path: '/internal/workchat/agents/{agentId}',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.manageWorkchat],
        },
      },
      validate: {
        params: schema.object({
          agentId: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, res) => {
      const { agentId } = request.params;
      const { agentService } = getServices();
      const client = await agentService.getScopedClient({ request });

      const didDelete = await client.delete(agentId);

      return res.ok<DeleteAgentResponse>({
        body: {
          success: didDelete,
        },
      });
    })
  );

  // API to list all accessible agents
  router.get(
    {
      path: '/internal/workchat/agents',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.useWorkchat],
        },
      },
      validate: false,
    },
    wrapHandler(async (ctx, request, res) => {
      const { agentService } = getServices();
      const client = await agentService.getScopedClient({ request });

      const agents = await client.list();

      return res.ok<ListAgentResponse>({
        body: {
          agents,
        },
      });
    })
  );
};

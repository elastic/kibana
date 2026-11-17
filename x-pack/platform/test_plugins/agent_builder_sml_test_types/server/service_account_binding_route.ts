/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';
import { isAgentBuilderError } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';

export interface StartDependencies {
  agentBuilder: AgentBuilderPluginStart;
}

export const AGENT_SERVICE_ACCOUNT_TEST_PATH =
  '/internal/agent_builder_test/agents/{id}/service_account';

/**
 * Binding an agent to a service account has no HTTP API until the UI manages it: the plugin that
 * owns an agent binds through the agent registry on the start contract. This route exposes that
 * same call, as the requesting user, so the Scout suite can exercise bindings end to end.
 */
export const registerServiceAccountBindingRoute = (core: CoreSetup<StartDependencies>) => {
  const router = core.http.createRouter();
  router.put(
    {
      path: AGENT_SERVICE_ACCOUNT_TEST_PATH,
      security: {
        authz: {
          enabled: false,
          reason:
            'Test route: the agent registry enforces write access and manage_security itself.',
        },
      },
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.object({ service_account_id: schema.nullable(schema.string()) }),
      },
    },
    async (_context, request, response) => {
      const [, { agentBuilder }] = await core.getStartServices();
      const registry = await agentBuilder.agents.getRegistry({ request });
      try {
        const agent = await registry.setServiceAccount(
          request.params.id,
          request.body.service_account_id
        );
        return response.ok({
          body: { id: agent.id, service_account_id: agent.service_account_id },
        });
      } catch (error) {
        if (isAgentBuilderError(error)) {
          const statusCode = error.meta?.statusCode;
          return response.customError({
            statusCode: typeof statusCode === 'number' ? statusCode : 500,
            body: { message: error.message },
          });
        }
        throw error;
      }
    }
  );
};

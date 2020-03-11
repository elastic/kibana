/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import bluebird from 'bluebird';
import { appContextService, agentConfigService } from '../../services';
import { listAgents } from '../../services/agents';
import {
  GetAgentConfigsRequestSchema,
  GetOneAgentConfigRequestSchema,
  CreateAgentConfigRequestSchema,
  UpdateAgentConfigRequestSchema,
  DeleteAgentConfigsRequestSchema,
  GetFullAgentConfigRequestSchema,
} from '../../types';
import {
  GetAgentConfigsResponse,
  GetOneAgentConfigResponse,
  CreateAgentConfigResponse,
  UpdateAgentConfigResponse,
  DeleteAgentConfigsResponse,
  GetFullAgentConfigResponse,
} from '../../../common';

export const getAgentConfigsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentConfigsRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const { items, total, page, perPage } = await agentConfigService.list(soClient, request.query);
    const body: GetAgentConfigsResponse = {
      items,
      total,
      page,
      perPage,
      success: true,
    };

    await bluebird.map(
      items,
      agentConfig =>
        listAgents(soClient, {
          showInactive: true,
          perPage: 0,
          page: 1,
          kuery: `agents.config_id:${agentConfig.id}`,
        }).then(({ total: agentTotal }) => (agentConfig.agents = agentTotal)),
      { concurrency: 10 }
    );

    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const getOneAgentConfigHandler: RequestHandler<TypeOf<
  typeof GetOneAgentConfigRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const agentConfig = await agentConfigService.get(soClient, request.params.agentConfigId);
    if (agentConfig) {
      const body: GetOneAgentConfigResponse = {
        item: agentConfig,
        success: true,
      };
      return response.ok({
        body,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent config not found' },
      });
    }
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const createAgentConfigHandler: RequestHandler<
  undefined,
  TypeOf<typeof CreateAgentConfigRequestSchema.query>,
  TypeOf<typeof CreateAgentConfigRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const agentConfig = await agentConfigService.create(soClient, request.body, {
      user: user || undefined,
    });
    const body: CreateAgentConfigResponse = { item: agentConfig, success: true };
    return response.ok({
      body,
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const updateAgentConfigHandler: RequestHandler<
  TypeOf<typeof UpdateAgentConfigRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdateAgentConfigRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const agentConfig = await agentConfigService.update(
      soClient,
      request.params.agentConfigId,
      request.body,
      {
        user: user || undefined,
      }
    );
    const body: UpdateAgentConfigResponse = { item: agentConfig, success: true };
    return response.ok({
      body,
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const deleteAgentConfigsHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeleteAgentConfigsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const body: DeleteAgentConfigsResponse = await agentConfigService.delete(
      soClient,
      request.body.agentConfigIds
    );
    return response.ok({
      body,
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const getFullAgentConfig: RequestHandler<TypeOf<
  typeof GetFullAgentConfigRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;

  try {
    const fullAgentConfig = await agentConfigService.getFullConfig(
      soClient,
      request.params.agentConfigId
    );
    if (fullAgentConfig) {
      const body: GetFullAgentConfigResponse = {
        item: fullAgentConfig,
        success: true,
      };
      return response.ok({
        body,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent config not found' },
      });
    }
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { appContextService, agentConfigService } from '../../services';
import {
  GetAgentConfigsRequestSchema,
  GetAgentConfigsResponse,
  GetOneAgentConfigRequestSchema,
  GetOneAgentConfigResponse,
  CreateAgentConfigRequestSchema,
  CreateAgentConfigResponse,
  UpdateAgentConfigRequestSchema,
  UpdateAgentConfigResponse,
  DeleteAgentConfigsRequestSchema,
  DeleteAgentConfigsResponse,
} from '../../types';

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
  undefined,
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

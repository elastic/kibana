/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import {
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  GetOneAgentEventsRequestSchema,
  PostAgentCheckinRequestSchema,
} from '../../types';
import * as AgentService from '../../services/agents';
import { appContextService } from '../../services/app_context';
import { verifyAccessApiKey } from '../../services/api_keys';

export const getAgentHandler: RequestHandler<TypeOf<
  typeof GetOneAgentRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const agent = await AgentService.getAgent(soClient, request.params.agentId);

    const body = {
      item: {
        ...agent,
        // TODO fix that
        // status: AgentStatusHelper.getAgentStatus(agent),
      },
      success: true,
    };

    return response.ok({ body });
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const getAgentEventsHandler: RequestHandler<
  TypeOf<typeof GetOneAgentEventsRequestSchema.params>,
  TypeOf<typeof GetOneAgentEventsRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const { page, perPage, kuery } = request.query;
    const { items, total } = await AgentService.getAgentEvents(soClient, request.params.agentId, {
      page,
      perPage,
      kuery,
    });

    return response.ok({
      body: {
        list: items,
        total,
        success: true,
        page,
        perPage,
      },
    });
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const deleteAgentHandler: RequestHandler<TypeOf<
  typeof DeleteAgentRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    await AgentService.deleteAgent(soClient, request.params.agentId);

    const body = {
      success: true,
      action: 'deleted',
    };

    return response.ok({ body });
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const updateAgentHandler: RequestHandler<
  TypeOf<typeof UpdateAgentRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateAgentRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    await AgentService.updateAgent(soClient, request.params.agentId, {
      userProvidedMetatada: request.body.user_provided_metadata,
    });
    const agent = await AgentService.getAgent(soClient, request.params.agentId);

    const body = {
      item: {
        ...agent,
        // TODO fix that
        // status: AgentStatusHelper.getAgentStatus(agent),
      },
      success: true,
    };

    return response.ok({ body });
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const postAgentCheckinHandler: RequestHandler<
  TypeOf<typeof PostAgentCheckinRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentCheckinRequestSchema.body>
> = async (context, request, response) => {
  try {
    const soClient = appContextService.getInternalSavedObjectsClient();
    const res = await verifyAccessApiKey(request.headers);
    if (!res.valid) {
      return response.unauthorized({
        body: { message: 'Invalid Access API Key' },
      });
    }
    const agent = await AgentService.getAgentByAccessAPIKeyId(
      soClient,
      res.accessApiKeyId as string
    );
    const { actions } = await AgentService.agentCheckin(
      soClient,
      agent,
      [], // TODO events
      request.body.local_metadata
    );
    const body = {
      action: 'checkin',
      success: true,
      actions: actions.map(a => ({
        type: a.type,
        data: a.data ? JSON.parse(a.data) : a.data,
        id: a.id,
      })),
    };

    return response.ok({ body });
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const getAgentsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentsRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const { agents, total, page, perPage } = await AgentService.listAgents(soClient, {
      page: request.query.page,
      perPage: request.query.perPage,
      showInactive: request.query.showInactive,
      kuery: request.query.kuery,
    });

    const body = {
      list: agents.map(agent => ({
        ...agent,
        // TODO Fix that
        // status: AgentStatusHelper.getAgentStatus(agent),
      })),
      success: true,
      total,
      page,
      perPage,
    };
    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

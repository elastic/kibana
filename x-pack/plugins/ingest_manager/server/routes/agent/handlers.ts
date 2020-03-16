/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, KibanaRequest } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import {
  GetAgentsResponse,
  GetOneAgentResponse,
  GetOneAgentEventsResponse,
  PostAgentCheckinResponse,
  PostAgentEnrollResponse,
  PostAgentUnenrollResponse,
  GetAgentStatusResponse,
} from '../../../common/types';
import {
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  GetOneAgentEventsRequestSchema,
  PostAgentCheckinRequestSchema,
  PostAgentEnrollRequestSchema,
  PostAgentAcksRequestSchema,
  PostAgentUnenrollRequestSchema,
  GetAgentStatusRequestSchema,
} from '../../types';
import * as AgentService from '../../services/agents';
import * as APIKeyService from '../../services/api_keys';
import { appContextService } from '../../services/app_context';

function getInternalUserSOClient(request: KibanaRequest) {
  // soClient as kibana internal users, be carefull on how you use it, security is not enabled
  return appContextService.getSavedObjects().getScopedClient(request, {
    excludedWrappers: ['security'],
  });
}

export const getAgentHandler: RequestHandler<TypeOf<
  typeof GetOneAgentRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const agent = await AgentService.getAgent(soClient, request.params.agentId);

    const body: GetOneAgentResponse = {
      item: {
        ...agent,
        status: AgentService.getAgentStatus(agent),
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

    const body: GetOneAgentEventsResponse = {
      list: items,
      total,
      success: true,
      page,
      perPage,
    };

    return response.ok({
      body,
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
    if (e.isBoom) {
      return response.customError({
        statusCode: e.output.statusCode,
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
        status: AgentService.getAgentStatus(agent),
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
    const soClient = getInternalUserSOClient(request);
    const res = APIKeyService.parseApiKey(request.headers);
    const agent = await AgentService.getAgentByAccessAPIKeyId(soClient, res.apiKeyId);
    const { actions } = await AgentService.agentCheckin(
      soClient,
      agent,
      request.body.events || [],
      request.body.local_metadata
    );
    const body: PostAgentCheckinResponse = {
      action: 'checkin',
      success: true,
      actions: actions.map(a => ({
        type: a.type,
        data: a.data ? JSON.parse(a.data) : a.data,
        id: a.id,
        created_at: a.created_at,
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

export const postAgentAcksHandler: RequestHandler<
  TypeOf<typeof PostAgentAcksRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentAcksRequestSchema.body>
> = async (context, request, response) => {
  try {
    const soClient = getInternalUserSOClient(request);
    const res = APIKeyService.parseApiKey(request.headers);
    const agent = await AgentService.getAgentByAccessAPIKeyId(soClient, res.apiKeyId as string);

    await AgentService.acknowledgeAgentActions(soClient, agent, request.body.action_ids);

    const body = {
      action: 'acks',
      success: true,
    };

    return response.ok({ body });
  } catch (e) {
    if (e.isBoom) {
      return response.customError({
        statusCode: e.output.statusCode,
        body: { message: e.message },
      });
    }

    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const postAgentEnrollHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostAgentEnrollRequestSchema.body>
> = async (context, request, response) => {
  try {
    const soClient = getInternalUserSOClient(request);
    const { apiKeyId } = APIKeyService.parseApiKey(request.headers);
    const enrollmentAPIKey = await APIKeyService.getEnrollmentAPIKeyById(soClient, apiKeyId);

    if (!enrollmentAPIKey || !enrollmentAPIKey.active) {
      return response.unauthorized({
        body: { message: 'Invalid Enrollment API Key' },
      });
    }

    const agent = await AgentService.enroll(
      soClient,
      request.body.type,
      enrollmentAPIKey.config_id as string,
      {
        userProvided: request.body.metadata.user_provided,
        local: request.body.metadata.local,
      },
      request.body.shared_id
    );
    const body: PostAgentEnrollResponse = {
      action: 'created',
      success: true,
      item: {
        ...agent,
        status: AgentService.getAgentStatus(agent),
      },
    };

    return response.ok({ body });
  } catch (e) {
    if (e.isBoom) {
      return response.customError({
        statusCode: e.output.statusCode,
        body: { message: e.message },
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

    const body: GetAgentsResponse = {
      list: agents.map(agent => ({
        ...agent,
        status: AgentService.getAgentStatus(agent),
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

export const postAgentsUnenrollHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostAgentUnenrollRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const kuery = (request.body as { kuery: string }).kuery;
    let toUnenrollIds: string[] = (request.body as { ids: string[] }).ids || [];

    if (kuery) {
      let hasMore = true;
      let page = 1;
      while (hasMore) {
        const { agents } = await AgentService.listAgents(soClient, {
          page: page++,
          perPage: 100,
          kuery,
          showInactive: true,
        });
        if (agents.length === 0) {
          hasMore = false;
        }
        const agentIds = agents.filter(a => a.active).map(a => a.id);
        toUnenrollIds = toUnenrollIds.concat(agentIds);
      }
    }
    const results = (await AgentService.unenrollAgents(soClient, toUnenrollIds)).map(
      ({
        success,
        id,
        error,
      }): {
        success: boolean;
        id: string;
        action: 'unenrolled';
        error?: {
          message: string;
        };
      } => {
        return {
          success,
          id,
          action: 'unenrolled',
          error: error && {
            message: error.message,
          },
        };
      }
    );

    const body: PostAgentUnenrollResponse = {
      results,
      success: results.every(result => result.success),
    };
    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const getAgentStatusForConfigHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentStatusRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    // TODO change path
    const results = await AgentService.getAgentStatusForConfig(soClient, request.query.configId);

    const body: GetAgentStatusResponse = { results, success: true };

    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { AbortController } from 'abort-controller';
import {
  GetAgentsResponse,
  GetOneAgentResponse,
  GetOneAgentEventsResponse,
  PostAgentCheckinResponse,
  PostAgentEnrollResponse,
  GetAgentStatusResponse,
  PutAgentReassignResponse,
  PostAgentEnrollRequest,
  PostBulkAgentReassignResponse,
} from '../../../common/types';
import {
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  GetOneAgentEventsRequestSchema,
  PostAgentCheckinRequest,
  GetAgentStatusRequestSchema,
  PutAgentReassignRequestSchema,
  PostBulkAgentReassignRequestSchema,
} from '../../types';
import { defaultIngestErrorHandler } from '../../errors';
import { licenseService } from '../../services';
import * as AgentService from '../../services/agents';
import * as APIKeyService from '../../services/api_keys';
import { appContextService } from '../../services/app_context';

export const getAgentHandler: RequestHandler<
  TypeOf<typeof GetOneAgentRequestSchema.params>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const agent = await AgentService.getAgent(soClient, request.params.agentId);

    const body: GetOneAgentResponse = {
      item: {
        ...agent,
        status: AgentService.getAgentStatus(agent),
      },
    };

    return response.ok({ body });
  } catch (error) {
    if (soClient.errors.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
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
      page,
      perPage,
    };

    return response.ok({
      body,
    });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }
    return defaultIngestErrorHandler({ error, response });
  }
};

export const deleteAgentHandler: RequestHandler<
  TypeOf<typeof DeleteAgentRequestSchema.params>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    await AgentService.deleteAgent(soClient, request.params.agentId);

    const body = {
      action: 'deleted',
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom) {
      return response.customError({
        statusCode: error.output.statusCode,
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
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
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};

export const postAgentCheckinHandler: RequestHandler<
  PostAgentCheckinRequest['params'],
  undefined,
  PostAgentCheckinRequest['body']
> = async (context, request, response) => {
  try {
    const soClient = appContextService.getInternalUserSOClient(request);
    const agent = await AgentService.authenticateAgentWithAccessToken(soClient, request);
    const abortController = new AbortController();
    request.events.aborted$.subscribe(() => {
      abortController.abort();
    });
    const signal = abortController.signal;
    const { actions } = await AgentService.agentCheckin(
      soClient,
      agent,
      {
        events: request.body.events || [],
        localMetadata: request.body.local_metadata,
        status: request.body.status,
      },
      { signal }
    );
    const body: PostAgentCheckinResponse = {
      action: 'checkin',
      actions: actions.map((a) => ({
        agent_id: agent.id,
        type: a.type,
        data: a.data,
        id: a.id,
        created_at: a.created_at,
      })),
    };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const postAgentEnrollHandler: RequestHandler<
  undefined,
  undefined,
  PostAgentEnrollRequest['body']
> = async (context, request, response) => {
  try {
    const soClient = appContextService.getInternalUserSOClient(request);
    const { apiKeyId } = APIKeyService.parseApiKeyFromHeaders(request.headers);
    const enrollmentAPIKey = await APIKeyService.getEnrollmentAPIKeyById(soClient, apiKeyId);

    if (!enrollmentAPIKey || !enrollmentAPIKey.active) {
      return response.unauthorized({
        body: { message: 'Invalid Enrollment API Key' },
      });
    }

    const agent = await AgentService.enroll(
      soClient,
      request.body.type,
      enrollmentAPIKey.policy_id as string,
      {
        userProvided: request.body.metadata.user_provided,
        local: request.body.metadata.local,
      },
      request.body.shared_id
    );
    const body: PostAgentEnrollResponse = {
      action: 'created',
      item: {
        ...agent,
        status: AgentService.getAgentStatus(agent),
      },
    };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
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
      showUpgradeable: request.query.showUpgradeable,
      kuery: request.query.kuery,
    });
    const totalInactive = request.query.showInactive
      ? await AgentService.countInactiveAgents(soClient, {
          kuery: request.query.kuery,
        })
      : 0;

    const body: GetAgentsResponse = {
      list: agents.map((agent) => ({
        ...agent,
        status: AgentService.getAgentStatus(agent),
      })),
      total,
      totalInactive,
      page,
      perPage,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const putAgentsReassignHandler: RequestHandler<
  TypeOf<typeof PutAgentReassignRequestSchema.params>,
  undefined,
  TypeOf<typeof PutAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    await AgentService.reassignAgent(soClient, request.params.agentId, request.body.policy_id);

    const body: PutAgentReassignResponse = {};
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const postBulkAgentsReassignHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  if (!licenseService.isGoldPlus()) {
    return response.customError({
      statusCode: 403,
      body: { message: 'Requires Gold license' },
    });
  }

  const soClient = context.core.savedObjects.client;
  try {
    // Reassign by array of IDs
    const result = Array.isArray(request.body.agents)
      ? await AgentService.reassignAgents(
          soClient,
          { agentIds: request.body.agents },
          request.body.policy_id
        )
      : await AgentService.reassignAgents(
          soClient,
          { kuery: request.body.agents },
          request.body.policy_id
        );
    const body: PostBulkAgentReassignResponse = result.saved_objects.reduce((acc, so) => {
      return {
        ...acc,
        [so.id]: {
          success: !so.error,
          error: so.error || undefined,
        },
      };
    }, {});
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getAgentStatusForAgentPolicyHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentStatusRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    // TODO change path
    const results = await AgentService.getAgentStatusForAgentPolicy(
      soClient,
      request.query.policyId
    );

    const body: GetAgentStatusResponse = { results };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

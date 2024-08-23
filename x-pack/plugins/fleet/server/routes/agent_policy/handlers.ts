/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest, RequestHandler, ResponseHeaders } from '@kbn/core/server';
import pMap from 'p-map';
import { safeDump } from 'js-yaml';

import { HTTPAuthorizationHeader } from '../../../common/http_authorization_header';

import { fullAgentPolicyToYaml } from '../../../common/services';
import { appContextService, agentPolicyService } from '../../services';
import { type AgentClient, getLatestAvailableAgentVersion } from '../../services/agents';
import { AGENTS_PREFIX, UNPRIVILEGED_AGENT_KUERY } from '../../constants';
import type {
  GetAgentPoliciesRequestSchema,
  GetOneAgentPolicyRequestSchema,
  CreateAgentPolicyRequestSchema,
  UpdateAgentPolicyRequestSchema,
  CopyAgentPolicyRequestSchema,
  DeleteAgentPolicyRequestSchema,
  GetFullAgentPolicyRequestSchema,
  GetK8sManifestRequestSchema,
  FleetRequestHandler,
  BulkGetAgentPoliciesRequestSchema,
  AgentPolicy,
  FleetRequestHandlerContext,
} from '../../types';

import type {
  GetAgentPoliciesResponse,
  GetAgentPoliciesResponseItem,
  GetOneAgentPolicyResponse,
  CreateAgentPolicyResponse,
  UpdateAgentPolicyResponse,
  CopyAgentPolicyResponse,
  DeleteAgentPolicyResponse,
  GetFullAgentPolicyResponse,
  GetFullAgentConfigMapResponse,
  GetFullAgentManifestResponse,
  BulkGetAgentPoliciesResponse,
} from '../../../common/types';
import {
  defaultFleetErrorHandler,
  AgentPolicyNotFoundError,
  FleetUnauthorizedError,
  FleetError,
} from '../../errors';
import { createAgentPolicyWithPackages } from '../../services/agent_policy_create';
import { updateAgentPolicySpaces } from '../../services/spaces/agent_policy';

export async function populateAssignedAgentsCount(
  agentClient: AgentClient,
  agentPolicies: AgentPolicy[]
) {
  await pMap(
    agentPolicies,
    (agentPolicy: GetAgentPoliciesResponseItem) => {
      const totalAgents = agentClient
        .listAgents({
          showInactive: true,
          perPage: 0,
          page: 1,
          kuery: `${AGENTS_PREFIX}.policy_id:${agentPolicy.id}`,
        })
        .then(({ total }) => (agentPolicy.agents = total));
      const unprivilegedAgents = agentClient
        .listAgents({
          showInactive: true,
          perPage: 0,
          page: 1,
          kuery: `${AGENTS_PREFIX}.policy_id:${agentPolicy.id} and ${UNPRIVILEGED_AGENT_KUERY}`,
        })
        .then(({ total }) => (agentPolicy.unprivileged_agents = total));
      return Promise.all([totalAgents, unprivilegedAgents]);
    },
    { concurrency: 10 }
  );
}

function sanitizeItemForReadAgentOnly(item: AgentPolicy): AgentPolicy {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    revision: item.revision,
    namespace: item.namespace,
    is_managed: item.is_managed,
    is_protected: item.is_protected,
    status: item.status,
    updated_at: item.updated_at,
    updated_by: item.updated_by,
    has_fleet_server: item.has_fleet_server,
    monitoring_enabled: item.monitoring_enabled,
    package_policies: [],
  };
}

export async function checkAgentPoliciesAllPrivilegesForSpaces(
  request: KibanaRequest,
  context: FleetRequestHandlerContext,
  spaceIds: string[]
) {
  const security = appContextService.getSecurity();
  const spaces = await (await context.fleet).getAllSpaces();
  const allSpaceId = spaces.map((s) => s.id);
  const res = await security.authz.checkPrivilegesWithRequest(request).atSpaces(allSpaceId, {
    kibana: [security.authz.actions.api.get(`fleet-agent-policies-all`)],
  });

  return allSpaceId.filter(
    (id) =>
      res.privileges.kibana.find((privilege) => privilege.resource === id)?.authorized ?? false
  );
}

export const getAgentPoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentPoliciesRequestSchema.query>
> = async (context, request, response) => {
  try {
    const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
    const soClient = fleetContext.internalSoClient;
    const esClient = coreContext.elasticsearch.client.asInternalUser;
    const {
      full: withPackagePolicies = false,
      noAgentCount = false,
      ...restOfQuery
    } = request.query;
    if (!fleetContext.authz.fleet.readAgentPolicies && withPackagePolicies) {
      throw new FleetUnauthorizedError(
        'full query parameter require agent policies read permissions'
      );
    }
    const { items, total, page, perPage } = await agentPolicyService.list(soClient, {
      withPackagePolicies,
      esClient,
      ...restOfQuery,
    });

    if (fleetContext.authz.fleet.readAgents && !noAgentCount) {
      await populateAssignedAgentsCount(fleetContext.agentClient.asCurrentUser, items);
    }

    const body: GetAgentPoliciesResponse = {
      items: !fleetContext.authz.fleet.readAgentPolicies
        ? items.map(sanitizeItemForReadAgentOnly)
        : items,
      total,
      page,
      perPage,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const bulkGetAgentPoliciesHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkGetAgentPoliciesRequestSchema.body>
> = async (context, request, response) => {
  try {
    const fleetContext = await context.fleet;
    const soClient = fleetContext.internalSoClient;
    const { full: withPackagePolicies = false, ignoreMissing = false, ids } = request.body;
    const items = await agentPolicyService.getByIDs(soClient, ids, {
      withPackagePolicies,
      ignoreMissing,
    });
    const body: BulkGetAgentPoliciesResponse = {
      items: !fleetContext.authz.fleet.readAgentPolicies
        ? items.map(sanitizeItemForReadAgentOnly)
        : items,
    };
    if (fleetContext.authz.fleet.readAgents) {
      await populateAssignedAgentsCount(fleetContext.agentClient.asCurrentUser, items);
    }

    return response.ok({ body });
  } catch (error) {
    if (error instanceof AgentPolicyNotFoundError) {
      return response.notFound({
        body: {
          message: error.message,
        },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const getOneAgentPolicyHandler: FleetRequestHandler<
  TypeOf<typeof GetOneAgentPolicyRequestSchema.params>
> = async (context, request, response) => {
  try {
    const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
    const soClient = coreContext.savedObjects.client;

    const agentPolicy = await agentPolicyService.get(soClient, request.params.agentPolicyId);
    if (agentPolicy) {
      if (fleetContext.authz.fleet.readAgents) {
        await populateAssignedAgentsCount(fleetContext.agentClient.asCurrentUser, [agentPolicy]);
      }
      const body: GetOneAgentPolicyResponse = {
        item: !fleetContext.authz.fleet.readAgentPolicies
          ? sanitizeItemForReadAgentOnly(agentPolicy)
          : agentPolicy,
      };
      return response.ok({
        body,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent policy not found' },
      });
    }
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const createAgentPolicyHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof CreateAgentPolicyRequestSchema.query>,
  TypeOf<typeof CreateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const withSysMonitoring = request.query.sys_monitoring ?? false;
  const monitoringEnabled = request.body.monitoring_enabled;
  const {
    has_fleet_server: hasFleetServer,
    force,
    space_ids: spaceIds,
    ...newPolicy
  } = request.body;
  const spaceId = fleetContext.spaceId;
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request, user?.username);

  try {
    let authorizedSpaces: string[] | undefined;
    if (spaceIds?.length) {
      authorizedSpaces = await checkAgentPoliciesAllPrivilegesForSpaces(request, context, spaceIds);
      for (const requestedSpaceId of spaceIds) {
        if (!authorizedSpaces.includes(requestedSpaceId)) {
          throw new FleetError(
            `No enough permissions to create policies in space ${requestedSpaceId}`
          );
        }
      }
    }

    const agentPolicy = await createAgentPolicyWithPackages({
      soClient,
      esClient,
      newPolicy,
      hasFleetServer,
      withSysMonitoring,
      monitoringEnabled,
      spaceId,
      user,
      authorizationHeader,
      force,
    });

    const body: CreateAgentPolicyResponse = {
      item: agentPolicy,
    };

    if (spaceIds && spaceIds.length > 1 && authorizedSpaces) {
      await updateAgentPolicySpaces({
        agentPolicyId: agentPolicy.id,
        currentSpaceId: spaceId,
        newSpaceIds: spaceIds,
        authorizedSpaces,
      });
    }

    return response.ok({
      body,
    });
  } catch (error) {
    if (error.statusCode) {
      return response.customError({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }
    return defaultFleetErrorHandler({ error, response });
  }
};

export const updateAgentPolicyHandler: FleetRequestHandler<
  TypeOf<typeof UpdateAgentPolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const { force, space_ids: spaceIds, ...data } = request.body;

  let spaceId = fleetContext.spaceId;

  try {
    if (spaceIds?.length) {
      const authorizedSpaces = await checkAgentPoliciesAllPrivilegesForSpaces(
        request,
        context,
        spaceIds
      );
      await updateAgentPolicySpaces({
        agentPolicyId: request.params.agentPolicyId,
        currentSpaceId: spaceId,
        newSpaceIds: spaceIds,
        authorizedSpaces,
      });

      spaceId = spaceIds[0];
    }
    const agentPolicy = await agentPolicyService.update(
      appContextService.getInternalUserSOClientForSpaceId(spaceId),
      esClient,
      request.params.agentPolicyId,
      data,
      { force, user, spaceId }
    );

    const body: UpdateAgentPolicyResponse = { item: agentPolicy };
    return response.ok({
      body,
    });
  } catch (error) {
    if (error.statusCode) {
      return response.customError({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }
    return defaultFleetErrorHandler({ error, response });
  }
};

export const copyAgentPolicyHandler: RequestHandler<
  TypeOf<typeof CopyAgentPolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof CopyAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  try {
    const agentPolicy = await agentPolicyService.copy(
      soClient,
      esClient,
      request.params.agentPolicyId,
      request.body,
      { user }
    );

    const body: CopyAgentPolicyResponse = { item: agentPolicy };
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const deleteAgentPoliciesHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeleteAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  try {
    const body: DeleteAgentPolicyResponse = await agentPolicyService.delete(
      soClient,
      esClient,
      request.body.agentPolicyId,
      { user, force: request.body.force }
    );
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getFullAgentPolicy: FleetRequestHandler<
  TypeOf<typeof GetFullAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetFullAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;

  if (request.query.kubernetes === true) {
    try {
      const agentVersion =
        await fleetContext.agentClient.asInternalUser.getLatestAgentAvailableVersion();
      const fullAgentConfigMap = await agentPolicyService.getFullAgentConfigMap(
        soClient,
        request.params.agentPolicyId,
        agentVersion,
        { standalone: request.query.standalone === true }
      );
      if (fullAgentConfigMap) {
        const body: GetFullAgentConfigMapResponse = {
          item: fullAgentConfigMap,
        };
        return response.ok({
          body,
        });
      } else {
        return response.customError({
          statusCode: 404,
          body: { message: 'Agent config map not found' },
        });
      }
    } catch (error) {
      return defaultFleetErrorHandler({ error, response });
    }
  } else {
    try {
      const fullAgentPolicy = await agentPolicyService.getFullAgentPolicy(
        soClient,
        request.params.agentPolicyId,
        {
          standalone: request.query.standalone === true,
        }
      );
      if (fullAgentPolicy) {
        const body: GetFullAgentPolicyResponse = {
          item: fullAgentPolicy,
        };
        return response.ok({
          body,
        });
      } else {
        return response.customError({
          statusCode: 404,
          body: { message: 'Agent policy not found' },
        });
      }
    } catch (error) {
      return defaultFleetErrorHandler({ error, response });
    }
  }
};

export const downloadFullAgentPolicy: FleetRequestHandler<
  TypeOf<typeof GetFullAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetFullAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const {
    params: { agentPolicyId },
  } = request;

  if (request.query.kubernetes === true) {
    try {
      const agentVersion =
        await fleetContext.agentClient.asInternalUser.getLatestAgentAvailableVersion();
      const fullAgentConfigMap = await agentPolicyService.getFullAgentConfigMap(
        soClient,
        request.params.agentPolicyId,
        agentVersion,
        { standalone: request.query.standalone === true }
      );
      if (fullAgentConfigMap) {
        const body = fullAgentConfigMap;
        const headers: ResponseHeaders = {
          'content-type': 'text/x-yaml',
          'content-disposition': `attachment; filename="elastic-agent-standalone-kubernetes.yml"`,
        };
        return response.ok({
          body,
          headers,
        });
      } else {
        return response.customError({
          statusCode: 404,
          body: { message: 'Agent config map not found' },
        });
      }
    } catch (error) {
      return defaultFleetErrorHandler({ error, response });
    }
  } else {
    try {
      const fullAgentPolicy = await agentPolicyService.getFullAgentPolicy(soClient, agentPolicyId, {
        standalone: request.query.standalone === true,
      });
      if (fullAgentPolicy) {
        const body = fullAgentPolicyToYaml(fullAgentPolicy, safeDump);
        const headers: ResponseHeaders = {
          'content-type': 'text/x-yaml',
          'content-disposition': `attachment; filename="elastic-agent.yml"`,
        };
        return response.ok({
          body,
          headers,
        });
      } else {
        return response.customError({
          statusCode: 404,
          body: { message: 'Agent policy not found' },
        });
      }
    } catch (error) {
      return defaultFleetErrorHandler({ error, response });
    }
  }
};

export const getK8sManifest: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetK8sManifestRequestSchema.query>
> = async (context, request, response) => {
  try {
    const fleetServer = request.query.fleetServer ?? '';
    const token = request.query.enrolToken ?? '';

    const agentVersion = await getLatestAvailableAgentVersion();

    const fullAgentManifest = await agentPolicyService.getFullAgentManifest(
      fleetServer,
      token,
      agentVersion
    );
    if (fullAgentManifest) {
      const body: GetFullAgentManifestResponse = {
        item: fullAgentManifest,
      };
      return response.ok({
        body,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent manifest not found' },
      });
    }
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const downloadK8sManifest: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetK8sManifestRequestSchema.query>
> = async (context, request, response) => {
  try {
    const fleetServer = request.query.fleetServer ?? '';
    const token = request.query.enrolToken ?? '';
    const agentVersion = await getLatestAvailableAgentVersion();
    const fullAgentManifest = await agentPolicyService.getFullAgentManifest(
      fleetServer,
      token,
      agentVersion
    );
    if (fullAgentManifest) {
      const body = fullAgentManifest;
      const headers: ResponseHeaders = {
        'content-type': 'text/x-yaml',
        'content-disposition': `attachment; filename="elastic-agent-managed-kubernetes.yml"`,
      };
      return response.ok({
        body,
        headers,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent manifest not found' },
      });
    }
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

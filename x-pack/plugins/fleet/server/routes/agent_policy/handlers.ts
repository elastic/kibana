/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RequestHandler, ResponseHeaders, ElasticsearchClient } from '@kbn/core/server';
import pMap from 'p-map';
import { safeDump } from 'js-yaml';

import { fullAgentPolicyToYaml } from '../../../common/services';
import { appContextService, agentPolicyService } from '../../services';
import { getAgentsByKuery } from '../../services/agents';
import { AGENTS_PREFIX } from '../../constants';
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
import { defaultFleetErrorHandler, AgentPolicyNotFoundError } from '../../errors';
import { createAgentPolicyWithPackages } from '../../services/agent_policy_create';

async function populateAssignedAgentsCount(
  esClient: ElasticsearchClient,
  agentPolicies: AgentPolicy[]
) {
  await pMap(
    agentPolicies,
    (agentPolicy: GetAgentPoliciesResponseItem) =>
      getAgentsByKuery(esClient, {
        showInactive: false,
        perPage: 0,
        page: 1,
        kuery: `${AGENTS_PREFIX}.policy_id:${agentPolicy.id}`,
      }).then(({ total: agentTotal }) => (agentPolicy.agents = agentTotal)),
    { concurrency: 10 }
  );
}

export const getAgentPoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentPoliciesRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.epm.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const { full: withPackagePolicies = false, ...restOfQuery } = request.query;
  try {
    const { items, total, page, perPage } = await agentPolicyService.list(soClient, {
      withPackagePolicies,
      ...restOfQuery,
    });

    const body: GetAgentPoliciesResponse = {
      items,
      total,
      page,
      perPage,
    };

    await populateAssignedAgentsCount(esClient, items);

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
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.epm.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const { full: withPackagePolicies = false, ignoreMissing = false, ids } = request.body;
  try {
    const items = await agentPolicyService.getByIDs(soClient, ids, {
      withPackagePolicies,
      ignoreMissing,
    });
    const body: BulkGetAgentPoliciesResponse = {
      items,
    };

    await populateAssignedAgentsCount(esClient, items);

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

export const getOneAgentPolicyHandler: RequestHandler<
  TypeOf<typeof GetOneAgentPolicyRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  try {
    const agentPolicy = await agentPolicyService.get(soClient, request.params.agentPolicyId);
    if (agentPolicy) {
      const body: GetOneAgentPolicyResponse = {
        item: agentPolicy,
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
  const soClient = fleetContext.epm.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const withSysMonitoring = request.query.sys_monitoring ?? false;
  const monitoringEnabled = request.body.monitoring_enabled;
  const { has_fleet_server: hasFleetServer, ...newPolicy } = request.body;
  const spaceId = fleetContext.spaceId;
  try {
    const body: CreateAgentPolicyResponse = {
      item: await createAgentPolicyWithPackages({
        soClient,
        esClient,
        newPolicy,
        hasFleetServer,
        withSysMonitoring,
        monitoringEnabled,
        spaceId,
        user,
      }),
    };

    return response.ok({
      body,
    });
  } catch (error) {
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
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  const { force, ...data } = request.body;
  const spaceId = fleetContext.spaceId;
  try {
    const agentPolicy = await agentPolicyService.update(
      soClient,
      esClient,
      request.params.agentPolicyId,
      data,
      {
        force,
        user: user || undefined,
        spaceId,
      }
    );
    const body: UpdateAgentPolicyResponse = { item: agentPolicy };
    return response.ok({
      body,
    });
  } catch (error) {
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
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const agentPolicy = await agentPolicyService.copy(
      soClient,
      esClient,
      request.params.agentPolicyId,
      request.body,
      {
        user: user || undefined,
      }
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
  try {
    const body: DeleteAgentPolicyResponse = await agentPolicyService.delete(
      soClient,
      esClient,
      request.body.agentPolicyId
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
  const soClient = fleetContext.epm.internalSoClient;

  if (request.query.kubernetes === true) {
    try {
      const fullAgentConfigMap = await agentPolicyService.getFullAgentConfigMap(
        soClient,
        request.params.agentPolicyId,
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
        { standalone: request.query.standalone === true }
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
  const soClient = fleetContext.epm.internalSoClient;
  const {
    params: { agentPolicyId },
  } = request;

  if (request.query.kubernetes === true) {
    try {
      const fullAgentConfigMap = await agentPolicyService.getFullAgentConfigMap(
        soClient,
        request.params.agentPolicyId,
        { standalone: request.query.standalone === true }
      );
      if (fullAgentConfigMap) {
        const body = fullAgentConfigMap;
        const headers: ResponseHeaders = {
          'content-type': 'text/x-yaml',
          'content-disposition': `attachment; filename="elastic-agent-standalone-kubernetes.yaml"`,
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
    const fullAgentManifest = await agentPolicyService.getFullAgentManifest(fleetServer, token);
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
    const fullAgentManifest = await agentPolicyService.getFullAgentManifest(fleetServer, token);
    if (fullAgentManifest) {
      const body = fullAgentManifest;
      const headers: ResponseHeaders = {
        'content-type': 'text/x-yaml',
        'content-disposition': `attachment; filename="elastic-agent-managed-kubernetes.yaml"`,
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

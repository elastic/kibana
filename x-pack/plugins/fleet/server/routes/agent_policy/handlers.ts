/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  ElasticsearchClient,
  RequestHandler,
  ResponseHeaders,
  SavedObjectsClientContract,
} from 'src/core/server';
import pMap from 'p-map';
import { safeDump } from 'js-yaml';

import type { AuthenticatedUser } from '../../../../security/common/model';

import { fullAgentPolicyToYaml } from '../../../common/services';
import { appContextService, agentPolicyService, packagePolicyService } from '../../services';
import { getAgentsByKuery } from '../../services/agents';
import { AGENTS_PREFIX } from '../../constants';
import type {
  AgentPolicy,
  GetAgentPoliciesRequestSchema,
  GetOneAgentPolicyRequestSchema,
  CreateAgentPolicyRequestSchema,
  UpdateAgentPolicyRequestSchema,
  CopyAgentPolicyRequestSchema,
  DeleteAgentPolicyRequestSchema,
  GetFullAgentPolicyRequestSchema,
  FleetRequestHandler,
} from '../../types';
import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_SERVER_PACKAGE,
  FLEET_SYSTEM_PACKAGE,
} from '../../../common';
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
} from '../../../common';
import { defaultIngestErrorHandler } from '../../errors';
import { incrementPackageName } from '../../services/package_policy';
import { ensureInstalledPackage } from '../../services/epm/packages';
import { ensureDefaultEnrollmentAPIKeysExists } from '../../services/setup';

export const getAgentPoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentPoliciesRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.fleet.epm.internalSoClient;
  const esClient = context.core.elasticsearch.client.asInternalUser;
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

    await pMap(
      items,
      (agentPolicy: GetAgentPoliciesResponseItem) =>
        getAgentsByKuery(esClient, {
          showInactive: false,
          perPage: 0,
          page: 1,
          kuery: `${AGENTS_PREFIX}.policy_id:${agentPolicy.id}`,
        }).then(({ total: agentTotal }) => (agentPolicy.agents = agentTotal)),
      { concurrency: 10 }
    );

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getOneAgentPolicyHandler: RequestHandler<
  TypeOf<typeof GetOneAgentPolicyRequestSchema.params>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
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
    return defaultIngestErrorHandler({ error, response });
  }
};

async function getAgentPolicyId(soClient: SavedObjectsClientContract): Promise<string | undefined> {
  let agentPolicyId;
  // creating first fleet server policy with id 'fleet-server-policy'
  const FLEET_SERVER_POLICY_ID = 'fleet-server-policy';
  let agentPolicy;
  try {
    agentPolicy = await agentPolicyService.get(soClient, FLEET_SERVER_POLICY_ID, false);
  } catch (err) {
    if (!err.isBoom || err.output.statusCode !== 404) {
      throw err;
    }
  }
  if (!agentPolicy) {
    agentPolicyId = FLEET_SERVER_POLICY_ID;
  }
  return agentPolicyId;
}

export const createAgentPolicyHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof CreateAgentPolicyRequestSchema.query>,
  TypeOf<typeof CreateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const withSysMonitoring = request.query.sys_monitoring ?? false;
  const { has_fleet_server: hasFleetServer, ...newPolicy } = request.body;
  const spaceId = context.fleet.spaceId;
  try {
    let agentPolicyId;
    if (hasFleetServer) {
      // install fleet server package if not yet installed
      await ensureInstalledPackage({
        savedObjectsClient: soClient,
        pkgName: FLEET_SERVER_PACKAGE,
        esClient,
      });

      agentPolicyId = await getAgentPolicyId(soClient);
    }
    if (withSysMonitoring) {
      // install system package if not yet installed
      await ensureInstalledPackage({
        savedObjectsClient: soClient,
        pkgName: FLEET_SYSTEM_PACKAGE,
        esClient,
      });
    }
    if (request.body.monitoring_enabled?.length) {
      // install elastic agent package if not yet installed
      ensureInstalledPackage({
        savedObjectsClient: soClient,
        pkgName: FLEET_ELASTIC_AGENT_PACKAGE,
        esClient,
      });
    }
    const agentPolicy = await agentPolicyService.create(soClient, esClient, newPolicy, {
      user,
      id: agentPolicyId,
    });

    // Create the fleet server package policy and add it to agent policy.
    if (hasFleetServer) {
      await createPackagePolicy(soClient, esClient, agentPolicy, FLEET_SERVER_PACKAGE, {
        spaceId,
        user,
      });
    }

    // Create the system monitoring package policy and add it to agent policy.
    if (withSysMonitoring) {
      await createPackagePolicy(soClient, esClient, agentPolicy, FLEET_SYSTEM_PACKAGE, {
        spaceId,
        user,
      });
    }

    await agentPolicyService.createFleetServerPolicy(soClient, agentPolicy.id);
    ensureDefaultEnrollmentAPIKeysExists(soClient, esClient);

    const body: CreateAgentPolicyResponse = {
      item: agentPolicy,
    };

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

async function createPackagePolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicy: AgentPolicy,
  packageToInstall: string,
  options: { spaceId: string; user: AuthenticatedUser | undefined }
) {
  // If needed, retrieve package information and build a new package policy for the package
  // NOTE: we ignore failures in attempting to create package policy, since agent policy might have been created
  // successfully
  const newPackagePolicy = await packagePolicyService
    .buildPackagePolicyFromPackage(soClient, packageToInstall)
    .catch(() => undefined);

  if (!newPackagePolicy) return;

  newPackagePolicy.policy_id = agentPolicy.id;
  newPackagePolicy.namespace = agentPolicy.namespace;
  newPackagePolicy.name = await incrementPackageName(soClient, packageToInstall);

  await packagePolicyService.create(soClient, esClient, newPackagePolicy, {
    spaceId: options.spaceId,
    user: options.user,
    bumpRevision: false,
  });
}

export const updateAgentPolicyHandler: RequestHandler<
  TypeOf<typeof UpdateAgentPolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const agentPolicy = await agentPolicyService.update(
      soClient,
      esClient,
      request.params.agentPolicyId,
      request.body,
      {
        user: user || undefined,
      }
    );
    const body: UpdateAgentPolicyResponse = { item: agentPolicy };
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const copyAgentPolicyHandler: RequestHandler<
  TypeOf<typeof CopyAgentPolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof CopyAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
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
    return defaultIngestErrorHandler({ error, response });
  }
};

export const deleteAgentPoliciesHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeleteAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
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
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getFullAgentPolicy: RequestHandler<
  TypeOf<typeof GetFullAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetFullAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;

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
      return defaultIngestErrorHandler({ error, response });
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
      return defaultIngestErrorHandler({ error, response });
    }
  }
};

export const downloadFullAgentPolicy: RequestHandler<
  TypeOf<typeof GetFullAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetFullAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
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
      return defaultIngestErrorHandler({ error, response });
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
      return defaultIngestErrorHandler({ error, response });
    }
  }
};

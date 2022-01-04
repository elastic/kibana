/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ResponseHeaders } from 'src/core/server';
import pMap from 'p-map';
import { safeDump } from 'js-yaml';

import { fullAgentPolicyToYaml } from '../../../common/services';
import { appContextService, agentPolicyService, packagePolicyService } from '../../services';
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
  FleetRequestHandler,
} from '../../types';
import { FLEET_SYSTEM_PACKAGE } from '../../../common';
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

export const getAgentPoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentPoliciesRequestSchema.query>
> = async (context, request, response) => {
  const soRepo = context.fleet.epm.internalSoRepo;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const { full: withPackagePolicies = false, ...restOfQuery } = request.query;
  try {
    const { items, total, page, perPage } = await agentPolicyService.list(soRepo, {
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

export const getOneAgentPolicyHandler: FleetRequestHandler<
  TypeOf<typeof GetOneAgentPolicyRequestSchema.params>
> = async (context, request, response) => {
  const soRepo = context.fleet.epm.internalSoRepo;
  try {
    const agentPolicy = await agentPolicyService.get(soRepo, request.params.agentPolicyId);
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

export const createAgentPolicyHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof CreateAgentPolicyRequestSchema.query>,
  TypeOf<typeof CreateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soRepo = context.fleet.epm.internalSoRepo;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const withSysMonitoring = request.query.sys_monitoring ?? false;
  const spaceId = context.fleet.spaceId;
  try {
    // eslint-disable-next-line prefer-const
    let [agentPolicy, newSysPackagePolicy] = await Promise.all([
      agentPolicyService.create(soRepo, esClient, request.body, {
        user,
      }),
      // If needed, retrieve System package information and build a new package policy for the system package
      // NOTE: we ignore failures in attempting to create package policy, since agent policy might have been created
      // successfully
      withSysMonitoring
        ? packagePolicyService
            .buildPackagePolicyFromPackage(soRepo, FLEET_SYSTEM_PACKAGE)
            .catch(() => undefined)
        : undefined,
    ]);

    // Create the system monitoring package policy and add it to agent policy.
    if (withSysMonitoring && newSysPackagePolicy !== undefined && agentPolicy !== undefined) {
      newSysPackagePolicy.policy_id = agentPolicy.id;
      newSysPackagePolicy.namespace = agentPolicy.namespace;
      newSysPackagePolicy.name = await incrementPackageName(soRepo, FLEET_SYSTEM_PACKAGE);

      await packagePolicyService.create(soRepo, esClient, newSysPackagePolicy, {
        spaceId,
        user,
        bumpRevision: false,
      });
    }

    await agentPolicyService.createFleetServerPolicy(soRepo, agentPolicy.id);

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

export const updateAgentPolicyHandler: FleetRequestHandler<
  TypeOf<typeof UpdateAgentPolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soRepo = context.fleet.epm.internalSoRepo;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const agentPolicy = await agentPolicyService.update(
      soRepo,
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

export const copyAgentPolicyHandler: FleetRequestHandler<
  TypeOf<typeof CopyAgentPolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof CopyAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soRepo = context.fleet.epm.internalSoRepo;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const agentPolicy = await agentPolicyService.copy(
      soRepo,
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

export const deleteAgentPoliciesHandler: FleetRequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeleteAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soRepo = context.fleet.epm.internalSoRepo;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  try {
    const body: DeleteAgentPolicyResponse = await agentPolicyService.delete(
      soRepo,
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

export const getFullAgentPolicy: FleetRequestHandler<
  TypeOf<typeof GetFullAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetFullAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  const soRepo = context.fleet.epm.internalSoRepo;

  if (request.query.kubernetes === true) {
    try {
      const fullAgentConfigMap = await agentPolicyService.getFullAgentConfigMap(
        soRepo,
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
        soRepo,
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

export const downloadFullAgentPolicy: FleetRequestHandler<
  TypeOf<typeof GetFullAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetFullAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  const soRepo = context.fleet.epm.internalSoRepo;
  const {
    params: { agentPolicyId },
  } = request;

  if (request.query.kubernetes === true) {
    try {
      const fullAgentConfigMap = await agentPolicyService.getFullAgentConfigMap(
        soRepo,
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
      const fullAgentPolicy = await agentPolicyService.getFullAgentPolicy(soRepo, agentPolicyId, {
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

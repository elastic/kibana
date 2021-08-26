/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RequestHandler, ResponseHeaders } from 'src/core/server';
import bluebird from 'bluebird';

import { fullAgentPolicyToYaml } from '../../../common/services';
import { appContextService, agentPolicyService, packagePolicyService } from '../../services';
import { getAgentsByKuery } from '../../services/agents';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import type {
  GetAgentPoliciesRequestSchema,
  GetOneAgentPolicyRequestSchema,
  CreateAgentPolicyRequestSchema,
  UpdateAgentPolicyRequestSchema,
  CopyAgentPolicyRequestSchema,
  DeleteAgentPolicyRequestSchema,
  GetFullAgentPolicyRequestSchema,
} from '../../types';
import type { AgentPolicy, NewPackagePolicy } from '../../types';
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
} from '../../../common';
import { defaultIngestErrorHandler } from '../../errors';

export const getAgentPoliciesHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentPoliciesRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
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

    await bluebird.map(
      items,
      (agentPolicy: GetAgentPoliciesResponseItem) =>
        getAgentsByKuery(esClient, {
          showInactive: false,
          perPage: 0,
          page: 1,
          kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id:${agentPolicy.id}`,
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

export const createAgentPolicyHandler: RequestHandler<
  undefined,
  TypeOf<typeof CreateAgentPolicyRequestSchema.query>,
  TypeOf<typeof CreateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const withSysMonitoring = request.query.sys_monitoring ?? false;
  try {
    // eslint-disable-next-line prefer-const
    let [agentPolicy, newSysPackagePolicy] = await Promise.all<
      AgentPolicy,
      NewPackagePolicy | undefined
    >([
      agentPolicyService.create(soClient, esClient, request.body, {
        user,
      }),
      // If needed, retrieve System package information and build a new package policy for the system package
      // NOTE: we ignore failures in attempting to create package policy, since agent policy might have been created
      // successfully
      withSysMonitoring
        ? packagePolicyService
            .buildPackagePolicyFromPackage(soClient, FLEET_SYSTEM_PACKAGE)
            .catch(() => undefined)
        : undefined,
    ]);

    // Create the system monitoring package policy and add it to agent policy.
    if (withSysMonitoring && newSysPackagePolicy !== undefined && agentPolicy !== undefined) {
      newSysPackagePolicy.policy_id = agentPolicy.id;
      newSysPackagePolicy.namespace = agentPolicy.namespace;
      await packagePolicyService.create(soClient, esClient, newSysPackagePolicy, {
        user,
        bumpRevision: false,
      });
    }

    await agentPolicyService.createFleetPolicyChangeAction(soClient, agentPolicy.id);

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

export const updateAgentPolicyHandler: RequestHandler<
  TypeOf<typeof UpdateAgentPolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
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
  const esClient = context.core.elasticsearch.client.asCurrentUser;
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
  const esClient = context.core.elasticsearch.client.asCurrentUser;
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
};

export const downloadFullAgentPolicy: RequestHandler<
  TypeOf<typeof GetFullAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetFullAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const {
    params: { agentPolicyId },
  } = request;

  try {
    const fullAgentPolicy = await agentPolicyService.getFullAgentPolicy(soClient, agentPolicyId, {
      standalone: request.query.standalone === true,
    });
    if (fullAgentPolicy) {
      const body = fullAgentPolicyToYaml(fullAgentPolicy);
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
};

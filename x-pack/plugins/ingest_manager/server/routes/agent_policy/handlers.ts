/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, ResponseHeaders } from 'src/core/server';
import bluebird from 'bluebird';
import { fullAgentPolicyToYaml } from '../../../common/services';
import { appContextService, agentPolicyService, packagePolicyService } from '../../services';
import { listAgents } from '../../services/agents';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import {
  GetAgentPoliciesRequestSchema,
  GetOneAgentPolicyRequestSchema,
  CreateAgentPolicyRequestSchema,
  UpdateAgentPolicyRequestSchema,
  CopyAgentPolicyRequestSchema,
  DeleteAgentPolicyRequestSchema,
  GetFullAgentPolicyRequestSchema,
  AgentPolicy,
  DefaultPackages,
  NewPackagePolicy,
} from '../../types';
import {
  GetAgentPoliciesResponse,
  GetAgentPoliciesResponseItem,
  GetOneAgentPolicyResponse,
  CreateAgentPolicyResponse,
  UpdateAgentPolicyResponse,
  CopyAgentPolicyResponse,
  DeleteAgentPolicyResponse,
  GetFullAgentPolicyResponse,
} from '../../../common';

export const getAgentPoliciesHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentPoliciesRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
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
      success: true,
    };

    await bluebird.map(
      items,
      (agentPolicy: GetAgentPoliciesResponseItem) =>
        listAgents(soClient, {
          showInactive: false,
          perPage: 0,
          page: 1,
          kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id:${agentPolicy.id}`,
        }).then(({ total: agentTotal }) => (agentPolicy.agents = agentTotal)),
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

export const getOneAgentPolicyHandler: RequestHandler<TypeOf<
  typeof GetOneAgentPolicyRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const agentPolicy = await agentPolicyService.get(soClient, request.params.agentPolicyId);
    if (agentPolicy) {
      const body: GetOneAgentPolicyResponse = {
        item: agentPolicy,
        success: true,
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
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const createAgentPolicyHandler: RequestHandler<
  undefined,
  TypeOf<typeof CreateAgentPolicyRequestSchema.query>,
  TypeOf<typeof CreateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const withSysMonitoring = request.query.sys_monitoring ?? false;
  try {
    // eslint-disable-next-line prefer-const
    let [agentPolicy, newSysPackagePolicy] = await Promise.all<
      AgentPolicy,
      NewPackagePolicy | undefined
    >([
      agentPolicyService.create(soClient, request.body, {
        user,
      }),
      // If needed, retrieve System package information and build a new package policy for the system package
      // NOTE: we ignore failures in attempting to create package policy, since agent policy might have been created
      // successfully
      withSysMonitoring
        ? packagePolicyService
            .buildPackagePolicyFromPackage(soClient, DefaultPackages.system)
            .catch(() => undefined)
        : undefined,
    ]);

    // Create the system monitoring package policy and add it to agent policy.
    if (withSysMonitoring && newSysPackagePolicy !== undefined && agentPolicy !== undefined) {
      newSysPackagePolicy.policy_id = agentPolicy.id;
      newSysPackagePolicy.namespace = agentPolicy.namespace;
      await packagePolicyService.create(soClient, callCluster, newSysPackagePolicy, {
        user,
        bumpRevision: false,
      });
    }

    const body: CreateAgentPolicyResponse = {
      item: agentPolicy,
      success: true,
    };

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

export const updateAgentPolicyHandler: RequestHandler<
  TypeOf<typeof UpdateAgentPolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof UpdateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const agentPolicy = await agentPolicyService.update(
      soClient,
      request.params.agentPolicyId,
      request.body,
      {
        user: user || undefined,
      }
    );
    const body: UpdateAgentPolicyResponse = { item: agentPolicy, success: true };
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

export const copyAgentPolicyHandler: RequestHandler<
  TypeOf<typeof CopyAgentPolicyRequestSchema.params>,
  unknown,
  TypeOf<typeof CopyAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const agentPolicy = await agentPolicyService.copy(
      soClient,
      request.params.agentPolicyId,
      request.body,
      {
        user: user || undefined,
      }
    );
    const body: CopyAgentPolicyResponse = { item: agentPolicy, success: true };
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

export const deleteAgentPoliciesHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeleteAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const body: DeleteAgentPolicyResponse = await agentPolicyService.delete(
      soClient,
      request.body.agentPolicyId
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
        success: true,
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
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
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
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

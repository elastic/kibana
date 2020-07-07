/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, ResponseHeaders } from 'src/core/server';
import bluebird from 'bluebird';
import { configToYaml } from '../../../common/services';
import { appContextService, agentConfigService, packageConfigService } from '../../services';
import { listAgents } from '../../services/agents';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import {
  GetAgentConfigsRequestSchema,
  GetOneAgentConfigRequestSchema,
  CreateAgentConfigRequestSchema,
  UpdateAgentConfigRequestSchema,
  CopyAgentConfigRequestSchema,
  DeleteAgentConfigRequestSchema,
  GetFullAgentConfigRequestSchema,
  AgentConfig,
  DefaultPackages,
  NewPackageConfig,
} from '../../types';
import {
  GetAgentConfigsResponse,
  GetAgentConfigsResponseItem,
  GetOneAgentConfigResponse,
  CreateAgentConfigResponse,
  UpdateAgentConfigResponse,
  CopyAgentConfigResponse,
  DeleteAgentConfigResponse,
  GetFullAgentConfigResponse,
} from '../../../common';

export const getAgentConfigsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentConfigsRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const { full: withPackageConfigs = false, ...restOfQuery } = request.query;
  try {
    const { items, total, page, perPage } = await agentConfigService.list(soClient, {
      withPackageConfigs,
      ...restOfQuery,
    });
    const body: GetAgentConfigsResponse = {
      items,
      total,
      page,
      perPage,
      success: true,
    };

    await bluebird.map(
      items,
      (agentConfig: GetAgentConfigsResponseItem) =>
        listAgents(soClient, {
          showInactive: false,
          perPage: 0,
          page: 1,
          kuery: `${AGENT_SAVED_OBJECT_TYPE}.config_id:${agentConfig.id}`,
        }).then(({ total: agentTotal }) => (agentConfig.agents = agentTotal)),
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
  TypeOf<typeof CreateAgentConfigRequestSchema.query>,
  TypeOf<typeof CreateAgentConfigRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const user = (await appContextService.getSecurity()?.authc.getCurrentUser(request)) || undefined;
  const withSysMonitoring = request.query.sys_monitoring ?? false;
  try {
    // eslint-disable-next-line prefer-const
    let [agentConfig, newSysPackageConfig] = await Promise.all<
      AgentConfig,
      NewPackageConfig | undefined
    >([
      agentConfigService.create(soClient, request.body, {
        user,
      }),
      // If needed, retrieve System package information and build a new package config for the system package
      // NOTE: we ignore failures in attempting to create package config, since config might have been created
      // successfully
      withSysMonitoring
        ? packageConfigService
            .buildPackageConfigFromPackage(soClient, DefaultPackages.system)
            .catch(() => undefined)
        : undefined,
    ]);

    // Create the system monitoring package config and add it to agent config.
    if (withSysMonitoring && newSysPackageConfig !== undefined && agentConfig !== undefined) {
      newSysPackageConfig.config_id = agentConfig.id;
      newSysPackageConfig.namespace = agentConfig.namespace;
      await packageConfigService.create(soClient, callCluster, newSysPackageConfig, {
        user,
      });
    }

    const body: CreateAgentConfigResponse = {
      item: agentConfig,
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

export const copyAgentConfigHandler: RequestHandler<
  TypeOf<typeof CopyAgentConfigRequestSchema.params>,
  unknown,
  TypeOf<typeof CopyAgentConfigRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const agentConfig = await agentConfigService.copy(
      soClient,
      request.params.agentConfigId,
      request.body,
      {
        user: user || undefined,
      }
    );
    const body: CopyAgentConfigResponse = { item: agentConfig, success: true };
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
  TypeOf<typeof DeleteAgentConfigRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const body: DeleteAgentConfigResponse = await agentConfigService.delete(
      soClient,
      request.body.agentConfigId
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

export const getFullAgentConfig: RequestHandler<TypeOf<
  typeof GetFullAgentConfigRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;

  try {
    const fullAgentConfig = await agentConfigService.getFullConfig(
      soClient,
      request.params.agentConfigId
    );
    if (fullAgentConfig) {
      const body: GetFullAgentConfigResponse = {
        item: fullAgentConfig,
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

export const downloadFullAgentConfig: RequestHandler<TypeOf<
  typeof GetFullAgentConfigRequestSchema.params
>> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const {
    params: { agentConfigId },
  } = request;

  try {
    const fullAgentConfig = await agentConfigService.getFullConfig(soClient, agentConfigId);
    if (fullAgentConfig) {
      const body = configToYaml(fullAgentConfig);
      const headers: ResponseHeaders = {
        'content-type': 'text/x-yaml',
        'content-disposition': `attachment; filename="elastic-agent-config-${fullAgentConfig.id}.yml"`,
      };
      return response.ok({
        body,
        headers,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import {
  AgentSOAttributes,
  PostAgentUpgradeResponse,
  PostBulkAgentUpgradeResponse,
} from '../../../common/types';
import { PostAgentUpgradeRequestSchema, PostBulkAgentUpgradeRequestSchema } from '../../types';
import * as AgentService from '../../services/agents';
import { appContextService } from '../../services';
import { defaultIngestErrorHandler } from '../../errors';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { savedObjectToAgent } from '../../services/agents/saved_objects';
import { isAgentUpgradeable } from '../../../common/services';

export const postAgentUpgradeHandler: RequestHandler<
  TypeOf<typeof PostAgentUpgradeRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentUpgradeRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const { version, source_uri: sourceUri } = request.body;

  // temporarily only allow upgrading to the same version as the installed kibana version
  const kibanaVersion = appContextService.getKibanaVersion();
  if (kibanaVersion !== version) {
    return response.customError({
      statusCode: 400,
      body: {
        message: `cannot upgrade agent to ${version} because it is different than the installed kibana version ${kibanaVersion}`,
      },
    });
  }
  const agentSO = await soClient.get<AgentSOAttributes>(
    AGENT_SAVED_OBJECT_TYPE,
    request.params.agentId
  );
  if (agentSO.attributes.unenrollment_started_at || agentSO.attributes.unenrolled_at) {
    return response.customError({
      statusCode: 400,
      body: {
        message: 'cannot upgrade an unenrolling or unenrolled agent',
      },
    });
  }

  const agent = savedObjectToAgent(agentSO);
  if (!isAgentUpgradeable(agent, kibanaVersion)) {
    return response.customError({
      statusCode: 400,
      body: {
        message: `agent ${request.params.agentId} is not upgradeable`,
      },
    });
  }

  try {
    await AgentService.sendUpgradeAgentAction({
      soClient,
      agentId: request.params.agentId,
      version,
      sourceUri,
    });

    const body: PostAgentUpgradeResponse = {};
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const postBulkAgentsUpgradeHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentUpgradeRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const { version, source_uri: sourceUri, agents } = request.body;

  // temporarily only allow upgrading to the same version as the installed kibana version
  const kibanaVersion = appContextService.getKibanaVersion();
  if (kibanaVersion !== version) {
    return response.customError({
      statusCode: 400,
      body: {
        message: `cannot upgrade agent to ${version} because it is different than the installed kibana version ${kibanaVersion}`,
      },
    });
  }

  try {
    if (Array.isArray(agents)) {
      await AgentService.sendUpgradeAgentsActions(soClient, {
        agentIds: agents,
        sourceUri,
        version,
      });
    } else {
      await AgentService.sendUpgradeAgentsActions(soClient, {
        kuery: agents,
        sourceUri,
        version,
      });
    }

    const body: PostBulkAgentUpgradeResponse = {};
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

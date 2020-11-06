/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import semver from 'semver';
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
  const { version, source_uri: sourceUri, force } = request.body;
  const kibanaVersion = appContextService.getKibanaVersion();
  try {
    checkVersionIsSame(version, kibanaVersion);
  } catch (err) {
    return response.customError({
      statusCode: 400,
      body: {
        message: err.message,
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
  if (!force && !isAgentUpgradeable(agent, kibanaVersion)) {
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
  const { version, source_uri: sourceUri, agents, force } = request.body;
  const kibanaVersion = appContextService.getKibanaVersion();
  try {
    checkVersionIsSame(version, kibanaVersion);
  } catch (err) {
    return response.customError({
      statusCode: 400,
      body: {
        message: err.message,
      },
    });
  }

  try {
    if (Array.isArray(agents)) {
      await AgentService.sendUpgradeAgentsActions(soClient, {
        agentIds: agents,
        sourceUri,
        version,
        force,
      });
    } else {
      await AgentService.sendUpgradeAgentsActions(soClient, {
        kuery: agents,
        sourceUri,
        version,
        force,
      });
    }

    const body: PostBulkAgentUpgradeResponse = {};
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const checkVersionIsSame = (version: string, kibanaVersion: string) => {
  // get version number only in case "-SNAPSHOT" is in it
  const kibanaVersionNumber = semver.coerce(kibanaVersion)?.version;
  if (!kibanaVersionNumber) throw new Error(`kibanaVersion ${kibanaVersionNumber} is not valid`);
  const versionToUpgradeNumber = semver.coerce(version)?.version;
  if (!versionToUpgradeNumber)
    throw new Error(`version to upgrade ${versionToUpgradeNumber} is not valid`);
  // temporarily only allow upgrading to the same version as the installed kibana version
  if (kibanaVersionNumber !== versionToUpgradeNumber)
    throw new Error(
      `cannot upgrade agent to ${versionToUpgradeNumber} because it is different than the installed kibana version ${kibanaVersionNumber}`
    );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from 'src/core/server';
import type { TypeOf } from '@kbn/config-schema';
import semverCoerce from 'semver/functions/coerce';

import type { PostAgentUpgradeResponse, PostBulkAgentUpgradeResponse } from '../../../common/types';
import type { PostAgentUpgradeRequestSchema, PostBulkAgentUpgradeRequestSchema } from '../../types';
import * as AgentService from '../../services/agents';
import { appContextService } from '../../services';
import { defaultIngestErrorHandler } from '../../errors';
import { isAgentUpgradeable } from '../../../common/services';
import { getAgentById } from '../../services/agents';

export const postAgentUpgradeHandler: RequestHandler<
  TypeOf<typeof PostAgentUpgradeRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentUpgradeRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const { version, source_uri: sourceUri, force } = request.body;
  const kibanaVersion = appContextService.getKibanaVersion();
  try {
    checkVersionIsSame(version, kibanaVersion);
    checkSourceUriAllowed(sourceUri);
  } catch (err) {
    return response.customError({
      statusCode: 400,
      body: {
        message: err.message,
      },
    });
  }
  const agent = await getAgentById(esClient, request.params.agentId);
  if (agent.unenrollment_started_at || agent.unenrolled_at) {
    return response.customError({
      statusCode: 400,
      body: {
        message: 'cannot upgrade an unenrolling or unenrolled agent',
      },
    });
  }

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
      esClient,
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
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const { version, source_uri: sourceUri, agents, force } = request.body;
  const kibanaVersion = appContextService.getKibanaVersion();
  try {
    checkVersionIsSame(version, kibanaVersion);
    checkSourceUriAllowed(sourceUri);
  } catch (err) {
    return response.customError({
      statusCode: 400,
      body: {
        message: err.message,
      },
    });
  }

  try {
    const agentOptions = Array.isArray(agents) ? { agentIds: agents } : { kuery: agents };
    const upgradeOptions = {
      ...agentOptions,
      sourceUri,
      version,
      force,
    };
    const results = await AgentService.sendUpgradeAgentsActions(soClient, esClient, upgradeOptions);
    const body = results.items.reduce<PostBulkAgentUpgradeResponse>((acc, so) => {
      acc[so.id] = {
        success: !so.error,
        error: so.error?.message,
      };
      return acc;
    }, {});

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const checkVersionIsSame = (version: string, kibanaVersion: string) => {
  // get version number only in case "-SNAPSHOT" is in it
  const kibanaVersionNumber = semverCoerce(kibanaVersion)?.version;
  if (!kibanaVersionNumber) throw new Error(`kibanaVersion ${kibanaVersionNumber} is not valid`);
  const versionToUpgradeNumber = semverCoerce(version)?.version;
  if (!versionToUpgradeNumber)
    throw new Error(`version to upgrade ${versionToUpgradeNumber} is not valid`);
  // temporarily only allow upgrading to the same version as the installed kibana version
  if (kibanaVersionNumber !== versionToUpgradeNumber)
    throw new Error(
      `cannot upgrade agent to ${versionToUpgradeNumber} because it is different than the installed kibana version ${kibanaVersionNumber}`
    );
};

const checkSourceUriAllowed = (sourceUri?: string) => {
  if (sourceUri && !appContextService.getConfig()?.developer?.allowAgentUpgradeSourceUri) {
    throw new Error(
      `source_uri is not allowed or recommended in production. Set xpack.fleet.developer.allowAgentUpgradeSourceUri in kibana.yml to true.`
    );
  }
};

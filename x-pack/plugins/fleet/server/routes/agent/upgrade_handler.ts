/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import semverCoerce from 'semver/functions/coerce';
import semverGt from 'semver/functions/gt';

import type {
  PostAgentUpgradeResponse,
  PostBulkAgentUpgradeResponse,
  GetCurrentUpgradesResponse,
} from '../../../common/types';
import type { PostAgentUpgradeRequestSchema, PostBulkAgentUpgradeRequestSchema } from '../../types';
import * as AgentService from '../../services/agents';
import { appContextService } from '../../services';
import { defaultIngestErrorHandler } from '../../errors';
import { SO_SEARCH_LIMIT } from '../../../common';
import { isAgentUpgradeable } from '../../../common/services';
import { getAgentById, getAgentsByKuery } from '../../services/agents';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, AGENTS_PREFIX } from '../../constants';

import { getMaxVersion } from '../../../common/services/get_max_version';

import { packagePolicyService } from '../../services/package_policy';

export const postAgentUpgradeHandler: RequestHandler<
  TypeOf<typeof PostAgentUpgradeRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentUpgradeRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const { version, source_uri: sourceUri, force } = request.body;
  const kibanaVersion = appContextService.getKibanaVersion();
  try {
    checkKibanaVersion(version, kibanaVersion);
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
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const {
    version,
    source_uri: sourceUri,
    agents,
    force,
    rollout_duration_seconds: upgradeDurationSeconds,
    start_time: startTime,
  } = request.body;
  const kibanaVersion = appContextService.getKibanaVersion();
  try {
    checkKibanaVersion(version, kibanaVersion);
    checkSourceUriAllowed(sourceUri);
    await checkFleetServerVersion(version, agents, soClient, esClient);
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
      upgradeDurationSeconds,
      startTime,
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

export const getCurrentUpgradesHandler: RequestHandler = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  try {
    const upgrades = await AgentService.getCurrentBulkUpgrades(esClient);
    const body: GetCurrentUpgradesResponse = { items: upgrades };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const checkKibanaVersion = (version: string, kibanaVersion: string) => {
  // get version number only in case "-SNAPSHOT" is in it
  const kibanaVersionNumber = semverCoerce(kibanaVersion)?.version;
  if (!kibanaVersionNumber) throw new Error(`kibanaVersion ${kibanaVersionNumber} is not valid`);
  const versionToUpgradeNumber = semverCoerce(version)?.version;
  if (!versionToUpgradeNumber)
    throw new Error(`version to upgrade ${versionToUpgradeNumber} is not valid`);

  if (semverGt(version, kibanaVersion))
    throw new Error(
      `cannot upgrade agent to ${versionToUpgradeNumber} because it is higher than the installed kibana version ${kibanaVersionNumber}`
    );
};

const checkSourceUriAllowed = (sourceUri?: string) => {
  if (sourceUri && !appContextService.getConfig()?.developer?.allowAgentUpgradeSourceUri) {
    throw new Error(
      `source_uri is not allowed or recommended in production. Set xpack.fleet.developer.allowAgentUpgradeSourceUri in kibana.yml to true.`
    );
  }
};

// Check the installed fleet server versions
// Allow upgrading if the agents to upgrade include fleet server agents
const checkFleetServerVersion = async (
  versionToUpgradeNumber: string,
  agentsIds: string | string[],
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  let packagePolicyData;
  try {
    packagePolicyData = await packagePolicyService.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: fleet_server`,
    });
  } catch (error) {
    throw new Error(error.message);
  }
  const agentPoliciesIds = packagePolicyData?.items.map((item) => item.policy_id);

  if (agentPoliciesIds.length === 0) {
    return;
  }

  let agentsResponse;
  try {
    agentsResponse = await getAgentsByKuery(esClient, {
      showInactive: false,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${AGENTS_PREFIX}.policy_id:${agentPoliciesIds.map((id) => `"${id}"`).join(' or ')}`,
    });
  } catch (error) {
    throw new Error(error.message);
  }

  const { agents: fleetServerAgents } = agentsResponse;

  if (fleetServerAgents.length === 0) {
    return;
  }
  const fleetServerIds = fleetServerAgents.map((agent) => agent.id);

  let hasFleetServerAgents: boolean;
  if (Array.isArray(agentsIds)) {
    hasFleetServerAgents = agentsIds.some((id) => fleetServerIds.includes(id));
  } else {
    hasFleetServerAgents = fleetServerIds.includes(agentsIds);
  }
  if (hasFleetServerAgents) {
    return;
  }

  const fleetServerVersions = fleetServerAgents.map(
    (agent) => agent.local_metadata.elastic.agent.version
  ) as string[];

  const maxFleetServerVersion = getMaxVersion(fleetServerVersions);

  if (semverGt(versionToUpgradeNumber, maxFleetServerVersion)) {
    throw new Error(
      `cannot upgrade agent to ${versionToUpgradeNumber} because it is higher than the latest fleet server version ${maxFleetServerVersion}`
    );
  }
};

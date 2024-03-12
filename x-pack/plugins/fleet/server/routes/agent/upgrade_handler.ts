/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import semverCoerce from 'semver/functions/coerce';
import semverGt from 'semver/functions/gt';
import semverMajor from 'semver/functions/major';
import semverMinor from 'semver/functions/minor';

import moment from 'moment';

import type { PostAgentUpgradeResponse } from '../../../common/types';
import type { PostAgentUpgradeRequestSchema, PostBulkAgentUpgradeRequestSchema } from '../../types';
import * as AgentService from '../../services/agents';
import { appContextService } from '../../services';
import { defaultFleetErrorHandler, AgentRequestInvalidError } from '../../errors';
import {
  getRecentUpgradeInfoForAgent,
  AGENT_UPGRADE_COOLDOWN_IN_MIN,
  isAgentUpgrading,
  getNotUpgradeableMessage,
  isAgentUpgradeableToVersion,
  differsOnlyInPatch,
} from '../../../common/services';
import { checkFleetServerVersion } from '../../../common/services/check_fleet_server_versions';
import { getAgentById } from '../../services/agents';

import { getAllFleetServerAgents } from '../../collectors/get_all_fleet_server_agents';
import { getLatestAvailableVersion } from '../../services/agents/versions';

export const postAgentUpgradeHandler: RequestHandler<
  TypeOf<typeof PostAgentUpgradeRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentUpgradeRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const { version, source_uri: sourceUri, force, skipRateLimitCheck } = request.body;
  const kibanaVersion = appContextService.getKibanaVersion();
  const latestAgentVersion = await getLatestAvailableVersion();
  try {
    checkKibanaVersion(version, kibanaVersion, force);
  } catch (err) {
    return response.customError({
      statusCode: 400,
      body: {
        message: err.message,
      },
    });
  }
  try {
    const agent = await getAgentById(esClient, soClient, request.params.agentId);

    const fleetServerAgents = await getAllFleetServerAgents(soClient, esClient);
    const agentIsFleetServer = fleetServerAgents.some(
      (fleetServerAgent) => fleetServerAgent.id === agent.id
    );
    if (!agentIsFleetServer) {
      try {
        checkFleetServerVersion(version, fleetServerAgents);
      } catch (err) {
        return response.customError({
          statusCode: 400,
          body: {
            message: err.message,
          },
        });
      }
    }

    const { hasBeenUpgradedRecently, timeToWaitMs } = getRecentUpgradeInfoForAgent(agent);
    const timeToWaitString = moment
      .utc(moment.duration(timeToWaitMs).asMilliseconds())
      .format('mm[m]ss[s]');

    if (!skipRateLimitCheck && hasBeenUpgradedRecently) {
      return response.customError({
        statusCode: 429,
        body: {
          message: `agent ${request.params.agentId} was upgraded less than ${AGENT_UPGRADE_COOLDOWN_IN_MIN} minutes ago. Please wait ${timeToWaitString} before trying again to ensure the upgrade will not be rolled back.`,
        },
        headers: {
          // retry-after expects seconds
          'retry-after': Math.ceil(timeToWaitMs / 1000).toString(),
        },
      });
    }

    if (agent.unenrollment_started_at || agent.unenrolled_at) {
      return response.customError({
        statusCode: 400,
        body: {
          message: 'cannot upgrade an unenrolling or unenrolled agent',
        },
      });
    }

    if (!force && isAgentUpgrading(agent)) {
      return response.customError({
        statusCode: 400,
        body: {
          message: `agent ${request.params.agentId} is already upgrading`,
        },
      });
    }

    if (!force && !skipRateLimitCheck && !isAgentUpgradeableToVersion(agent, version)) {
      return response.customError({
        statusCode: 400,
        body: {
          message: `Agent ${request.params.agentId} is not upgradeable: ${getNotUpgradeableMessage(
            agent,
            latestAgentVersion,
            version
          )}`,
        },
      });
    }

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
    return defaultFleetErrorHandler({ error, response });
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
    skipRateLimitCheck,
    rollout_duration_seconds: upgradeDurationSeconds,
    start_time: startTime,
    batchSize,
  } = request.body;
  const kibanaVersion = appContextService.getKibanaVersion();
  try {
    checkKibanaVersion(version, kibanaVersion, force);
    const fleetServerAgents = await getAllFleetServerAgents(soClient, esClient);
    checkFleetServerVersion(version, fleetServerAgents, force);
  } catch (err) {
    return response.customError({
      statusCode: 400,
      body: {
        message: err.message,
      },
    });
  }

  try {
    const agentOptions = Array.isArray(agents)
      ? { agentIds: agents }
      : { kuery: agents, showInactive: request.body.includeInactive };
    const upgradeOptions = {
      ...agentOptions,
      sourceUri,
      version,
      force,
      skipRateLimitCheck,
      upgradeDurationSeconds,
      startTime,
      batchSize,
    };
    const results = await AgentService.sendUpgradeAgentsActions(soClient, esClient, upgradeOptions);

    return response.ok({ body: { actionId: results.actionId } });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const checkKibanaVersion = (version: string, kibanaVersion: string, force = false) => {
  // get version number only in case "-SNAPSHOT" is in it
  const kibanaVersionNumber = semverCoerce(kibanaVersion)?.version;
  if (!kibanaVersionNumber)
    throw new AgentRequestInvalidError(`KibanaVersion ${kibanaVersionNumber} is not valid`);
  const versionToUpgradeNumber = semverCoerce(version)?.version;
  if (!versionToUpgradeNumber)
    throw new AgentRequestInvalidError(`Version to upgrade ${versionToUpgradeNumber} is not valid`);

  if (
    !force &&
    semverGt(versionToUpgradeNumber, kibanaVersionNumber) &&
    !differsOnlyInPatch(versionToUpgradeNumber, kibanaVersionNumber)
  ) {
    throw new AgentRequestInvalidError(
      `Cannot upgrade agent to ${versionToUpgradeNumber} because it is higher than the installed kibana version ${kibanaVersionNumber}`
    );
  }

  const kibanaMajorGt = semverMajor(kibanaVersionNumber) > semverMajor(versionToUpgradeNumber);
  const kibanaMajorEqMinorGte =
    semverMajor(kibanaVersionNumber) === semverMajor(versionToUpgradeNumber) &&
    semverMinor(kibanaVersionNumber) >= semverMinor(versionToUpgradeNumber);

  // When force is enabled, only the major and minor versions are checked
  if (force && !(kibanaMajorGt || kibanaMajorEqMinorGte)) {
    throw new AgentRequestInvalidError(
      `Cannot force upgrade agent to ${versionToUpgradeNumber} because it does not satisfy the major and minor of the installed kibana version ${kibanaVersionNumber}`
    );
  }
};

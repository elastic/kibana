/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import { ElasticAgentVersionInfo } from '../../common/types';

export async function getAgentVersionInfo(
  fleetStart: FleetStartContract,
  kibanaVersion: string
): Promise<ElasticAgentVersionInfo> {
  // If undefined, we will follow fleet's strategy to select latest available version:
  // for serverless we will use the latest published version, for statefull we will use
  // current Kibana version. If false, irrespective of fleet flags and logic, we are
  // explicitly deciding to not append the current version.
  const includeCurrentVersion = kibanaVersion.endsWith('-SNAPSHOT') ? false : undefined;

  const agentClient = fleetStart.agentService.asInternalUser;
  const [agentVersion, agentBaseVersion, agentDockerImageVersion] = await Promise.all([
    agentClient.getLatestAgentAvailableVersion(includeCurrentVersion),
    agentClient.getLatestAgentAvailableBaseVersion(includeCurrentVersion),
    agentClient.getLatestAgentAvailableDockerImageVersion(includeCurrentVersion),
  ]);
  return {
    agentVersion,
    agentBaseVersion,
    agentDockerImageVersion,
  };
}

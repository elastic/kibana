/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { kibanaPackageJson } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/test';
import type {
  GetPackagePoliciesResponse,
  AgentPolicy,
  GetOneAgentPolicyResponse,
  CreateAgentPolicyResponse,
} from '@kbn/fleet-plugin/common';
import {
  AGENT_POLICY_API_ROUTES,
  agentPolicyRouteService,
  AGENTS_INDEX,
  FLEET_SERVER_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  packagePolicyRouteService,
} from '@kbn/fleet-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import { fetchFleetLatestAvailableAgentVersion } from '../utils/fetch_fleet_version';
import { indexFleetServerAgent } from './index_fleet_agent';
import { catchAxiosErrorFormatAndThrow } from '../format_axios_error';
import { usageTracker } from './usage_tracker';
import { createToolingLogger, wrapErrorAndRejectPromise } from './utils';

/**
 * Will ensure that at least one fleet server is present in the `.fleet-agents` index. This will
 * enable the `Agent` section of kibana Fleet to be displayed. We skip on serverless because
 * Fleet Server agents are not checked against there.
 *
 * @param esClient
 * @param kbnClient
 * @param log
 * @param version
 */
export const enableFleetServerIfNecessary = usageTracker.track(
  'enableFleetServerIfNecessary',
  async (
    esClient: Client,
    isServerless: boolean = false,
    kbnClient: KbnClient,
    log: ToolingLog = createToolingLogger(),
    version: string = kibanaPackageJson.version
  ) => {
    let agentVersion = version;

    if (isServerless) {
      agentVersion = await fetchFleetLatestAvailableAgentVersion(kbnClient);
    }

    const agentPolicy = await getOrCreateFleetServerAgentPolicy(kbnClient, log);

    if (!isServerless && !(await hasFleetServerAgent(esClient, agentPolicy.id))) {
      log.debug(`Indexing a new fleet server agent`);
      const lastCheckin = new Date();
      lastCheckin.setFullYear(lastCheckin.getFullYear() + 1);

      const indexedAgent = await indexFleetServerAgent(esClient, log, {
        policy_id: agentPolicy.id,
        agent: { version: agentVersion },
        last_checkin_status: 'online',
        last_checkin: lastCheckin.toISOString(),
      });

      log.verbose(`New fleet server agent indexed:\n${JSON.stringify(indexedAgent)}`);
    } else {
      log.debug(`Nothing to do. A Fleet Server agent is already registered with Fleet`);
    }
  }
);

const getOrCreateFleetServerAgentPolicy = async (
  kbnClient: KbnClient,
  log: ToolingLog = createToolingLogger()
): Promise<AgentPolicy> => {
  const packagePolicies = await kbnClient
    .request<GetPackagePoliciesResponse>({
      method: 'GET',
      headers: { 'elastic-api-version': '2023-10-31' },
      path: packagePolicyRouteService.getListPath(),
      query: {
        perPage: 1,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "${FLEET_SERVER_PACKAGE}"`,
      },
    })
    .catch(catchAxiosErrorFormatAndThrow);

  if (packagePolicies.data.items[0]) {
    log.debug(`Found an existing package policy - fetching associated agent policy`);
    log.verbose(JSON.stringify(packagePolicies.data.items[0]));

    return kbnClient
      .request<GetOneAgentPolicyResponse>({
        headers: { 'elastic-api-version': '2023-10-31' },
        method: 'GET',
        path: agentPolicyRouteService.getInfoPath(packagePolicies.data.items[0].policy_ids[0]),
      })
      .catch(catchAxiosErrorFormatAndThrow)
      .then((response) => {
        log.verbose(
          `Existing agent policy for Fleet Server:\n${JSON.stringify(response.data.item)}`
        );

        return response.data.item;
      });
  }

  log.debug(`Creating a new fleet server agent policy`);

  // create new Fleet Server agent policy
  return kbnClient
    .request<CreateAgentPolicyResponse>({
      method: 'POST',
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      headers: { 'elastic-api-version': '2023-10-31' },
      body: {
        name: `Fleet Server policy (${Math.random().toString(32).substring(2)})`,
        description: `Created by CLI Tool via: ${__filename}`,
        namespace: 'default',
        monitoring_enabled: [],
        // This will ensure the Fleet Server integration policy
        // is also created and added to the agent policy
        has_fleet_server: true,
      },
    })
    .then((response) => {
      log.verbose(
        `No fleet server agent policy found. Created a new one:\n${JSON.stringify(
          response.data.item
        )}`
      );

      return response.data.item;
    })
    .catch(catchAxiosErrorFormatAndThrow);
};

const hasFleetServerAgent = async (
  esClient: Client,
  fleetServerAgentPolicyId: string
): Promise<boolean> => {
  const searchResponse = await esClient
    .search(
      {
        index: AGENTS_INDEX,
        ignore_unavailable: true,
        rest_total_hits_as_int: true,
        size: 1,
        _source: false,
        query: {
          match: {
            policy_id: fleetServerAgentPolicyId,
          },
        },
      },
      { ignore: [404] }
    )
    .catch(wrapErrorAndRejectPromise);

  return Boolean(searchResponse?.hits.total);
};

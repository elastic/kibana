/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { Client, estypes } from '@elastic/elasticsearch';
import type {
  Agent,
  AgentStatus,
  GetAgentPoliciesRequest,
  GetAgentPoliciesResponse,
  GetAgentsResponse,
} from '@kbn/fleet-plugin/common';
import {
  AGENT_API_ROUTES,
  agentPolicyRouteService,
  agentRouteService,
  AGENTS_INDEX,
} from '@kbn/fleet-plugin/common';
import { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type { GetFleetServerHostsResponse } from '@kbn/fleet-plugin/common/types/rest_spec/fleet_server_hosts';
import {
  enrollmentAPIKeyRouteService,
  fleetServerHostsRoutesService,
} from '@kbn/fleet-plugin/common/services';
import type {
  EnrollmentAPIKey,
  GetAgentsRequest,
  GetEnrollmentAPIKeysResponse,
  PostAgentUnenrollResponse,
} from '@kbn/fleet-plugin/common/types';
import nodeFetch from 'node-fetch';
import semver from 'semver';
import { FleetAgentGenerator } from '../../../common/endpoint/data_generators/fleet_agent_generator';

const fleetGenerator = new FleetAgentGenerator();

export const checkInFleetAgent = async (
  esClient: Client,
  agentId: string,
  {
    agentStatus = 'online',
    log = new ToolingLog(),
  }: Partial<{
    /** The agent status to be sent. If set to `random`, then one will be randomly generated */
    agentStatus: AgentStatus | 'random';
    log: ToolingLog;
  }> = {}
): Promise<estypes.UpdateResponse> => {
  const fleetAgentStatus =
    agentStatus === 'random' ? fleetGenerator.randomAgentStatus() : agentStatus;

  const update = pick(fleetGenerator.generateEsHitWithStatus(fleetAgentStatus)._source, [
    'last_checkin_status',
    'last_checkin',
    'active',
    'unenrollment_started_at',
    'unenrolled_at',
    'upgrade_started_at',
    'upgraded_at',
  ]);

  // WORKAROUND: Endpoint API will exclude metadata for any fleet agent whose status is `inactive`,
  // which means once we update the Fleet agent with that status, the metadata api will no longer
  // return the endpoint host info.'s. So - we avoid that here.
  update.active = true;

  // Ensure any `undefined` value is set to `null` for the update
  Object.entries(update).forEach(([key, value]) => {
    if (value === undefined) {
      // @ts-expect-error TS7053 Element implicitly has an 'any' type
      update[key] = null;
    }
  });

  log.verbose(`update to fleet agent [${agentId}][${agentStatus} / ${fleetAgentStatus}]: `, update);

  return esClient.update({
    index: AGENTS_INDEX,
    id: agentId,
    refresh: 'wait_for',
    retry_on_conflict: 5,
    body: {
      doc: update,
    },
  });
};

/**
 * Query Fleet Agents API
 *
 * @param kbnClient
 * @param options
 */
export const fetchFleetAgents = async (
  kbnClient: KbnClient,
  options: GetAgentsRequest['query']
): Promise<GetAgentsResponse> => {
  return kbnClient
    .request<GetAgentsResponse>({
      method: 'GET',
      path: AGENT_API_ROUTES.LIST_PATTERN,
      query: options,
    })
    .then((response) => response.data);
};

/**
 * Will keep querying Fleet list of agents until the given `hostname` shows up as healthy
 *
 * @param kbnClient
 * @param hostname
 * @param timeoutMs
 */
export const waitForHostToEnroll = async (
  kbnClient: KbnClient,
  hostname: string,
  timeoutMs: number = 30000
): Promise<Agent> => {
  const started = new Date();
  const hasTimedOut = (): boolean => {
    const elapsedTime = Date.now() - started.getTime();
    return elapsedTime > timeoutMs;
  };
  let found: Agent | undefined;

  while (!found && !hasTimedOut()) {
    found = await fetchFleetAgents(kbnClient, {
      perPage: 1,
      kuery: `(local_metadata.host.hostname.keyword : "${hostname}") and (status:online)`,
      showInactive: false,
    }).then((response) => response.items[0]);

    if (!found) {
      // sleep and check again
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (!found) {
    throw new Error(`Timed out waiting for host [${hostname}] to show up in Fleet`);
  }

  return found;
};

/**
 * Returns the URL for the default Fleet Server connected to the stack
 * @param kbnClient
 */
export const fetchFleetServerUrl = async (kbnClient: KbnClient): Promise<string | undefined> => {
  const fleetServerListResponse = await kbnClient
    .request<GetFleetServerHostsResponse>({
      method: 'GET',
      path: fleetServerHostsRoutesService.getListPath(),
      query: {
        perPage: 100,
      },
    })
    .then((response) => response.data);

  // TODO:PT need to also pull in the Proxies and use that instead if defiend for url

  let url: string | undefined;

  for (const fleetServer of fleetServerListResponse.items) {
    if (!url || fleetServer.is_default) {
      url = fleetServer.host_urls[0];

      if (fleetServer.is_default) {
        break;
      }
    }
  }

  return url;
};

/**
 * Retrieve the API enrollment key for a given FLeet Agent Policy
 * @param kbnClient
 * @param agentPolicyId
 */
export const fetchAgentPolicyEnrollmentKey = async (
  kbnClient: KbnClient,
  agentPolicyId: string
): Promise<string | undefined> => {
  const apiKey: EnrollmentAPIKey | undefined = await kbnClient
    .request<GetEnrollmentAPIKeysResponse>({
      method: 'GET',
      path: enrollmentAPIKeyRouteService.getListPath(),
      query: { kuery: `policy_id: "${agentPolicyId}"` },
    })
    .then((response) => response.data.items[0]);

  if (!apiKey) {
    return;
  }

  return apiKey.api_key;
};

/**
 * Retrieves a list of Fleet Agent policies
 * @param kbnClient
 * @param options
 */
export const fetchAgentPolicyList = async (
  kbnClient: KbnClient,
  options: GetAgentPoliciesRequest['query'] = {}
) => {
  return kbnClient
    .request<GetAgentPoliciesResponse>({
      method: 'GET',
      path: agentPolicyRouteService.getListPath(),
      query: options,
    })
    .then((response) => response.data);
};

/**
 * Returns the Agent Version that matches the current stack version. Will use `SNAPSHOT` if
 * appropriate too.
 * @param kbnClient
 */
export const getAgentVersionMatchingCurrentStack = async (
  kbnClient: KbnClient
): Promise<string> => {
  const kbnStatus = await kbnClient.status.get();
  let version = kbnStatus.version.number;

  // Add `-SNAPSHOT` if version indicates it was from a snapshot or the build hash starts
  // with `xxxxxxxxx` (value that seems to be present when running kibana from source)
  if (
    kbnStatus.version.build_snapshot ||
    kbnStatus.version.build_hash.startsWith('XXXXXXXXXXXXXXX')
  ) {
    version += '-SNAPSHOT';
  }

  return version;
};

interface ElasticArtifactSearchResponse {
  manifest: {
    'last-update-time': string;
    'seconds-since-last-update': number;
  };
  packages: {
    [packageFileName: string]: {
      architecture: string;
      os: string[];
      type: string;
      asc_url: string;
      sha_url: string;
      url: string;
    };
  };
}

/**
 * Retrieves the download URL to the Linux installation package for a given version of the Elastic Agent
 * @param version
 * @param closestMatch
 * @param log
 */
export const getAgentDownloadUrl = async (
  version: string,
  /**
   * When set to true a check will be done to determine the latest version of the agent that
   * is less than or equal to the `version` provided
   */
  closestMatch: boolean = false,
  log?: ToolingLog
): Promise<string> => {
  const agentVersion = closestMatch ? await getLatestAgentDownloadVersion(version, log) : version;
  const downloadArch =
    { arm64: 'arm64', x64: 'x86_64' }[process.arch] ?? `UNSUPPORTED_ARCHITECTURE_${process.arch}`;
  const agentFile = `elastic-agent-${agentVersion}-linux-${downloadArch}.tar.gz`;
  const artifactSearchUrl = `https://artifacts-api.elastic.co/v1/search/${agentVersion}/${agentFile}`;

  log?.verbose(`Retrieving elastic agent download URL from:\n    ${artifactSearchUrl}`);

  const searchResult: ElasticArtifactSearchResponse = await nodeFetch(artifactSearchUrl).then(
    (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to search elastic's artifact repository: ${response.statusText} (HTTP ${response.status}) {URL: ${artifactSearchUrl})`
        );
      }

      return response.json();
    }
  );

  log?.verbose(searchResult);

  if (!searchResult.packages[agentFile]) {
    throw new Error(`Unable to find an Agent download URL for version [${agentVersion}]`);
  }

  return searchResult.packages[agentFile].url;
};

/**
 * Given a stack version number, function will return the closest Agent download version available
 * for download. THis could be the actual version passed in or lower.
 * @param version
 */
export const getLatestAgentDownloadVersion = async (
  version: string,
  log?: ToolingLog
): Promise<string> => {
  const artifactsUrl = 'https://artifacts-api.elastic.co/v1/versions';
  const semverMatch = `<=${version}`;
  const artifactVersionsResponse: { versions: string[] } = await nodeFetch(artifactsUrl).then(
    (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to retrieve list of versions from elastic's artifact repository: ${response.statusText} (HTTP ${response.status}) {URL: ${artifactsUrl})`
        );
      }

      return response.json();
    }
  );

  const stackVersionToArtifactVersion: Record<string, string> =
    artifactVersionsResponse.versions.reduce((acc, artifactVersion) => {
      const stackVersion = artifactVersion.split('-SNAPSHOT')[0];
      acc[stackVersion] = artifactVersion;
      return acc;
    }, {} as Record<string, string>);

  log?.verbose(
    `Versions found from [${artifactsUrl}]:\n${JSON.stringify(
      stackVersionToArtifactVersion,
      null,
      2
    )}`
  );

  const matchedVersion = semver.maxSatisfying(
    Object.keys(stackVersionToArtifactVersion),
    semverMatch
  );

  if (!matchedVersion) {
    throw new Error(`Unable to find a semver version that meets ${semverMatch}`);
  }

  return stackVersionToArtifactVersion[matchedVersion];
};

/**
 * Un-enrolls a Fleet agent
 *
 * @param kbnClient
 * @param agentId
 * @param force
 */
export const unEnrollFleetAgent = async (
  kbnClient: KbnClient,
  agentId: string,
  force = false
): Promise<PostAgentUnenrollResponse> => {
  const { data } = await kbnClient.request<PostAgentUnenrollResponse>({
    method: 'POST',
    path: agentRouteService.getUnenrollPath(agentId),
    body: { revoke: force },
  });

  return data;
};

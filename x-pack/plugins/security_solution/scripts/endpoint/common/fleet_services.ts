/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, pick } from 'lodash';
import type { Client, estypes } from '@elastic/elasticsearch';
import type {
  Agent,
  AgentStatus,
  GetAgentPoliciesRequest,
  GetAgentPoliciesResponse,
  GetAgentsResponse,
  GetPackagePoliciesRequest,
  GetPackagePoliciesResponse,
  CreateAgentPolicyRequest,
  AgentPolicy,
  CreateAgentPolicyResponse,
  CreatePackagePolicyResponse,
  CreatePackagePolicyRequest,
  PackagePolicy,
  GetInfoResponse,
  GetOneAgentPolicyResponse,
} from '@kbn/fleet-plugin/common';
import {
  AGENT_API_ROUTES,
  AGENT_POLICY_API_ROUTES,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  agentPolicyRouteService,
  agentRouteService,
  AGENTS_INDEX,
  API_VERSIONS,
  APP_API_ROUTES,
  epmRouteService,
  PACKAGE_POLICY_API_ROUTES,
} from '@kbn/fleet-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type { GetFleetServerHostsResponse } from '@kbn/fleet-plugin/common/types/rest_spec/fleet_server_hosts';
import {
  enrollmentAPIKeyRouteService,
  fleetServerHostsRoutesService,
  outputRoutesService,
} from '@kbn/fleet-plugin/common/services';
import type {
  EnrollmentAPIKey,
  GetAgentsRequest,
  GetEnrollmentAPIKeysResponse,
  PostAgentUnenrollResponse,
  GenerateServiceTokenResponse,
  GetOutputsResponse,
} from '@kbn/fleet-plugin/common/types';
import nodeFetch from 'node-fetch';
import semver from 'semver';
import axios from 'axios';
import { userInfo } from 'os';
import { getEndpointPackageInfo } from '../../../common/endpoint/utils/package';
import type { DownloadAndStoreAgentResponse } from './agent_downloads_service';
import { downloadAndStoreAgent } from './agent_downloads_service';
import type { HostVm } from './types';
import {
  createToolingLogger,
  RETRYABLE_TRANSIENT_ERRORS,
  retryOnError,
  wrapErrorAndRejectPromise,
} from '../../../common/endpoint/data_loaders/utils';
import { fetchKibanaStatus } from './stack_services';
import { catchAxiosErrorFormatAndThrow } from './format_axios_error';
import { FleetAgentGenerator } from '../../../common/endpoint/data_generators/fleet_agent_generator';

const fleetGenerator = new FleetAgentGenerator();
const CURRENT_USERNAME = userInfo().username.toLowerCase();

export const checkInFleetAgent = async (
  esClient: Client,
  agentId: string,
  {
    agentStatus = 'online',
    log = createToolingLogger(),
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
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      query: options,
    })
    .catch(catchAxiosErrorFormatAndThrow)
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
  let agentId: string | undefined;

  while (!found && !hasTimedOut()) {
    found = await retryOnError(
      async () =>
        fetchFleetAgents(kbnClient, {
          perPage: 1,
          kuery: `(local_metadata.host.hostname.keyword : "${hostname}")`,
          showInactive: false,
        }).then((response) => {
          agentId = response.items[0]?.id;
          return response.items.filter((agent) => agent.status === 'online')[0];
        }),
      RETRYABLE_TRANSIENT_ERRORS
    );

    if (!found) {
      // sleep and check again
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (!found) {
    throw Object.assign(
      new Error(
        `Timed out waiting for host [${hostname}] to show up in Fleet in ${
          timeoutMs / 60 / 1000
        } seconds`
      ),
      { agentId, hostname }
    );
  }

  return found;
};

export const fetchFleetServerHostList = async (
  kbnClient: KbnClient
): Promise<GetFleetServerHostsResponse> => {
  return kbnClient
    .request<GetFleetServerHostsResponse>({
      method: 'GET',
      path: fleetServerHostsRoutesService.getListPath(),
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    })
    .then((response) => response.data)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Returns the URL for the default Fleet Server connected to the stack
 * @param kbnClient
 */
export const fetchFleetServerUrl = async (kbnClient: KbnClient): Promise<string | undefined> => {
  const fleetServerListResponse = await fetchFleetServerHostList(kbnClient);

  // TODO:PT need to also pull in the Proxies and use that instead if defined for url?

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
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      query: { kuery: `policy_id: "${agentPolicyId}"` },
    })
    .catch(catchAxiosErrorFormatAndThrow)
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
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      query: options,
    })
    .then((response) => response.data)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Fetch a single Fleet Agent Policy
 * @param kbnClient
 * @param agentPolicyId
 */
export const fetchAgentPolicy = async (
  kbnClient: KbnClient,
  agentPolicyId: string
): Promise<AgentPolicy> => {
  return kbnClient
    .request<GetOneAgentPolicyResponse>({
      method: 'GET',
      path: agentPolicyRouteService.getInfoPath(agentPolicyId),
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .then((response) => response.data.item)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Retrieves a list of Fleet Integration policies
 * @param kbnClient
 * @param options
 */
export const fetchIntegrationPolicyList = async (
  kbnClient: KbnClient,
  options: GetPackagePoliciesRequest['query'] = {}
): Promise<GetPackagePoliciesResponse> => {
  return kbnClient
    .request<GetPackagePoliciesResponse>({
      method: 'GET',
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
      headers: {
        'elastic-api-version': '2023-10-31',
      },
      query: options,
    })
    .then((response) => response.data)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Returns the Agent Version that matches the current stack version. Will use `SNAPSHOT` if
 * appropriate too.
 * @param kbnClient
 */
export const getAgentVersionMatchingCurrentStack = async (
  kbnClient: KbnClient
): Promise<string> => {
  const kbnStatus = await fetchKibanaStatus(kbnClient);
  const agentVersions = await axios
    .get('https://artifacts-api.elastic.co/v1/versions')
    .then((response) => map(response.data.versions, (version) => version.split('-SNAPSHOT')[0]));

  let version =
    semver.maxSatisfying(agentVersions, `<=${kbnStatus.version.number}`) ??
    kbnStatus.version.number;

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

interface GetAgentDownloadUrlResponse {
  url: string;
  /** The file name (ex. the `*.tar.gz` file) */
  fileName: string;
  /** The directory name that the download archive will be extracted to (same as `fileName` but no file extensions) */
  dirName: string;
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
): Promise<GetAgentDownloadUrlResponse> => {
  const agentVersion = closestMatch ? await getLatestAgentDownloadVersion(version, log) : version;
  const downloadArch =
    { arm64: 'arm64', x64: 'x86_64' }[process.arch as string] ??
    `UNSUPPORTED_ARCHITECTURE_${process.arch}`;
  const fileNameNoExtension = `elastic-agent-${agentVersion}-linux-${downloadArch}`;
  const agentFile = `${fileNameNoExtension}.tar.gz`;
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

  return {
    url: searchResult.packages[agentFile].url,
    fileName: agentFile,
    dirName: fileNameNoExtension,
  };
};

/**
 * Given a stack version number, function will return the closest Agent download version available
 * for download. THis could be the actual version passed in or lower.
 * @param version
 * @param log
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
  const { data } = await kbnClient
    .request<PostAgentUnenrollResponse>({
      method: 'POST',
      path: agentRouteService.getUnenrollPath(agentId),
      body: { revoke: force },
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
    })
    .catch(catchAxiosErrorFormatAndThrow);

  return data;
};

export const generateFleetServiceToken = async (
  kbnClient: KbnClient,
  logger: ToolingLog
): Promise<string> => {
  logger.info(`Generating new Fleet Service Token`);

  const serviceToken: string = await kbnClient
    .request<GenerateServiceTokenResponse>({
      method: 'POST',
      path: APP_API_ROUTES.GENERATE_SERVICE_TOKEN_PATTERN,
      headers: { 'elastic-api-version': '2023-10-31' },
      body: {},
    })
    .then((response) => response.data.value)
    .catch(catchAxiosErrorFormatAndThrow);

  logger.verbose(`New service token created: ${serviceToken}`);

  return serviceToken;
};

export const fetchFleetOutputs = async (kbnClient: KbnClient): Promise<GetOutputsResponse> => {
  return kbnClient
    .request<GetOutputsResponse>({
      method: 'GET',
      path: outputRoutesService.getListPath(),
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .then((response) => response.data)
    .catch(catchAxiosErrorFormatAndThrow);
};

export const getFleetElasticsearchOutputHost = async (kbnClient: KbnClient): Promise<string> => {
  const outputs = await fetchFleetOutputs(kbnClient);
  let host: string = '';

  for (const output of outputs.items) {
    if (output.type === 'elasticsearch') {
      host = output?.hosts?.[0] ?? '';
    }
  }

  if (!host) {
    throw new Error(`An output for Elasticsearch was not found in Fleet settings`);
  }

  return host;
};

interface EnrollHostVmWithFleetOptions {
  hostVm: HostVm;
  kbnClient: KbnClient;
  log: ToolingLog;
  /**
   * The Fleet Agent Policy ID that should be used to enroll the agent.
   * If undefined, then a default agent policy wil be created and used to enroll the host
   */
  agentPolicyId?: string;
  /** Agent version. Defaults to the version that the stack is running with */
  version?: string;
  closestVersionMatch?: boolean;
  useAgentCache?: boolean;
  timeoutMs?: number;
}

/**
 * Installs the Elastic agent on the provided Host VM and enrolls with it Fleet
 * @param hostVm
 * @param kbnClient
 * @param log
 * @param agentPolicyId
 * @param version
 * @param closestVersionMatch
 * @param useAgentCache
 * @param timeoutMs
 */
export const enrollHostVmWithFleet = async ({
  hostVm,
  kbnClient,
  log,
  agentPolicyId,
  version,
  closestVersionMatch = true,
  useAgentCache = true,
  timeoutMs = 240000,
}: EnrollHostVmWithFleetOptions): Promise<Agent> => {
  log.info(`Enrolling host VM [${hostVm.name}] with Fleet`);

  const agentVersion = version || (await getAgentVersionMatchingCurrentStack(kbnClient));
  const agentUrlInfo = await getAgentDownloadUrl(agentVersion, closestVersionMatch, log);

  const agentDownload: DownloadAndStoreAgentResponse = useAgentCache
    ? await downloadAndStoreAgent(agentUrlInfo.url)
    : { url: agentUrlInfo.url, directory: '', filename: agentUrlInfo.fileName, fullFilePath: '' };

  log.info(`Installing Elastic Agent`);

  // Mount the directory where the agent download cache is located
  if (useAgentCache) {
    const hostVmDownloadsDir = '/home/ubuntu/_agent_downloads';

    log.debug(
      `Mounting agents download cache directory [${agentDownload.directory}] to Host VM at [${hostVmDownloadsDir}]`
    );
    const downloadsMount = await hostVm.mount(agentDownload.directory, hostVmDownloadsDir);

    log.debug(`Extracting download archive on host VM`);
    await hostVm.exec(`tar -zxf ${downloadsMount.hostDir}/${agentDownload.filename}`);

    await downloadsMount.unmount();
  } else {
    log.debug(`Downloading Elastic Agent to host VM`);
    await hostVm.exec(`curl -L ${agentDownload.url} -o ${agentDownload.filename}`);

    log.debug(`Extracting download archive on host VM`);
    await hostVm.exec(`tar -zxf ${agentDownload.filename}`);
    await hostVm.exec(`rm -f ${agentDownload.filename}`);
  }

  const policyId = agentPolicyId || (await getOrCreateDefaultAgentPolicy({ kbnClient, log })).id;
  const [fleetServerUrl, enrollmentToken] = await Promise.all([
    fetchFleetServerUrl(kbnClient),
    fetchAgentPolicyEnrollmentKey(kbnClient, policyId),
  ]);

  const agentEnrollCommand = [
    'sudo',

    `/home/ubuntu/${agentUrlInfo.dirName}/elastic-agent`,

    'install',

    '--insecure',

    '--force',

    '--url',
    fleetServerUrl,

    '--enrollment-token',
    enrollmentToken,
  ].join(' ');

  log.info(`Enrolling Elastic Agent with Fleet`);
  log.verbose('Enrollment command:', agentEnrollCommand);

  await hostVm.exec(agentEnrollCommand);

  log.info(`Waiting for Agent to check-in with Fleet`);
  const agent = await waitForHostToEnroll(kbnClient, hostVm.name, timeoutMs);

  return agent;
};

interface GetOrCreateDefaultAgentPolicyOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
}

/**
 * Creates a default Fleet Agent policy (if it does not yet exist) for testing. If
 * policy already exists, then it will be reused.
 * @param kbnClient
 * @param log
 */
export const getOrCreateDefaultAgentPolicy = async ({
  kbnClient,
  log,
}: GetOrCreateDefaultAgentPolicyOptions): Promise<AgentPolicy> => {
  const agentPolicyName = `${CURRENT_USERNAME} test policy`;
  const existingPolicy = await fetchAgentPolicyList(kbnClient, {
    kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.name: "${agentPolicyName}"`,
  });

  if (existingPolicy.items[0]) {
    log.info(`Re-using existing Fleet test agent policy`);
    log.verbose(existingPolicy.items[0]);

    return existingPolicy.items[0];
  }

  log.info(`Creating new default test/dev Fleet agent policy`);

  const newAgentPolicyData: CreateAgentPolicyRequest['body'] = {
    name: agentPolicyName,
    description: `Policy created by security solution tooling`,
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics'],
  };

  const newAgentPolicy = kbnClient
    .request<CreateAgentPolicyResponse>({
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      method: 'POST',
      body: newAgentPolicyData,
    })
    .then((response) => response.data.item)
    .catch(wrapErrorAndRejectPromise);

  log.verbose(newAgentPolicy);

  return newAgentPolicy;
};

/**
 * Creates a Fleet Integration Policy using the API
 * @param kbnClient
 * @param policyData
 */
export const createIntegrationPolicy = async (
  kbnClient: KbnClient,
  policyData: CreatePackagePolicyRequest['body']
): Promise<PackagePolicy> => {
  return kbnClient
    .request<CreatePackagePolicyResponse>({
      path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
      method: 'POST',
      body: policyData,
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    })
    .then((response) => response.data.item)
    .catch(wrapErrorAndRejectPromise);
};

/**
 * Gets package information from fleet
 * @param kbnClient
 * @param packageName
 */
export const fetchPackageInfo = async (
  kbnClient: KbnClient,
  packageName: string
): Promise<GetInfoResponse['item']> => {
  return kbnClient
    .request<GetInfoResponse>({
      path: epmRouteService.getInfoPath(packageName),
      headers: { 'Elastic-Api-Version': '2023-10-31' },
      method: 'GET',
    })
    .then((response) => response.data.item)
    .catch(wrapErrorAndRejectPromise);
};

interface AddSentinelOneIntegrationToAgentPolicyOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  agentPolicyId: string;
  /** The URL to the SentinelOne Management console */
  consoleUrl: string;
  /** The SentinelOne API token */
  apiToken: string;
  integrationPolicyName?: string;
  /** Set to `true` if wanting to add the integration to the agent policy even if that agent policy already has one  */
  force?: boolean;
}

/**
 * Creates a Fleet SentinelOne Integration Policy and adds it to the provided Fleet Agent Policy.
 *
 * NOTE: by default, a new SentinelOne integration policy will only be created if one is not already
 * part of the provided Agent policy. Use `force` if wanting to still add it.
 *
 * @param kbnClient
 * @param log
 * @param agentPolicyId
 * @param consoleUrl
 * @param apiToken
 * @param integrationPolicyName
 * @param force
 */
export const addSentinelOneIntegrationToAgentPolicy = async ({
  kbnClient,
  log,
  agentPolicyId,
  consoleUrl,
  apiToken,
  integrationPolicyName = `SentinelOne policy (${Math.random().toString().substring(3)})`,
  force = false,
}: AddSentinelOneIntegrationToAgentPolicyOptions): Promise<PackagePolicy> => {
  // If `force` is `false and agent policy already has a SentinelOne integration, exit here
  if (!force) {
    log.debug(
      `Checking to see if agent policy [] already includes a SentinelOne integration policy`
    );

    const agentPolicy = await fetchAgentPolicy(kbnClient, agentPolicyId);

    log.verbose(agentPolicy);

    const integrationPolicies = agentPolicy.package_policies ?? [];

    for (const integrationPolicy of integrationPolicies) {
      if (integrationPolicy.package?.name === 'sentinel_one') {
        log.debug(
          `Returning existing SentinelOne Integration Policy included in agent policy [${agentPolicyId}]`
        );
        return integrationPolicy;
      }
    }
  }

  const {
    version: packageVersion,
    name: packageName,
    title: packageTitle,
  } = await fetchPackageInfo(kbnClient, 'sentinel_one');

  log.debug(
    `Creating new SentinelOne integration policy [package v${packageVersion}] and adding it to agent policy [${agentPolicyId}]`
  );

  return createIntegrationPolicy(kbnClient, {
    name: integrationPolicyName,
    description: `Created by script: ${__filename}`,
    namespace: 'default',
    policy_id: agentPolicyId,
    enabled: true,
    inputs: [
      {
        type: 'httpjson',
        policy_template: 'sentinel_one',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.activity',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '1m',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-activity'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.agent',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '5m',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-agent'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.alert',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '5m',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-alert'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.group',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '5m',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-group'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.threat',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '5m',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-threat'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
        ],
        vars: {
          url: {
            type: 'text',
            value: consoleUrl,
          },
          enable_request_tracer: {
            type: 'bool',
          },
          api_token: {
            type: 'password',
            value: apiToken,
          },
          proxy_url: {
            type: 'text',
          },
          ssl: {
            value:
              '#certificate_authorities:\n#  - |\n#    -----BEGIN CERTIFICATE-----\n#    MIIDCjCCAfKgAwIBAgITJ706Mu2wJlKckpIvkWxEHvEyijANBgkqhkiG9w0BAQsF\n#    ADAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwIBcNMTkwNzIyMTkyOTA0WhgPMjExOTA2\n#    MjgxOTI5MDRaMBQxEjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEB\n#    BQADggEPADCCAQoCggEBANce58Y/JykI58iyOXpxGfw0/gMvF0hUQAcUrSMxEO6n\n#    fZRA49b4OV4SwWmA3395uL2eB2NB8y8qdQ9muXUdPBWE4l9rMZ6gmfu90N5B5uEl\n#    94NcfBfYOKi1fJQ9i7WKhTjlRkMCgBkWPkUokvBZFRt8RtF7zI77BSEorHGQCk9t\n#    /D7BS0GJyfVEhftbWcFEAG3VRcoMhF7kUzYwp+qESoriFRYLeDWv68ZOvG7eoWnP\n#    PsvZStEVEimjvK5NSESEQa9xWyJOmlOKXhkdymtcUd/nXnx6UTCFgnkgzSdTWV41\n#    CI6B6aJ9svCTI2QuoIq2HxX/ix7OvW1huVmcyHVxyUECAwEAAaNTMFEwHQYDVR0O\n#    BBYEFPwN1OceFGm9v6ux8G+DZ3TUDYxqMB8GA1UdIwQYMBaAFPwN1OceFGm9v6ux\n#    8G+DZ3TUDYxqMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAG5D\n#    874A4YI7YUwOVsVAdbWtgp1d0zKcPRR+r2OdSbTAV5/gcS3jgBJ3i1BN34JuDVFw\n#    3DeJSYT3nxy2Y56lLnxDeF8CUTUtVQx3CuGkRg1ouGAHpO/6OqOhwLLorEmxi7tA\n#    H2O8mtT0poX5AnOAhzVy7QW0D/k4WaoLyckM5hUa6RtvgvLxOwA0U+VGurCDoctu\n#    8F4QOgTAWyh8EZIwaKCliFRSynDpv3JTUwtfZkxo6K6nce1RhCWFAsMvDZL8Dgc0\n#    yvgJ38BRsFOtkRuAGSf6ZUwTO8JJRRIFnpUzXflAnGivK9M13D5GEQMmIl6U9Pvk\n#    sxSmbIUfc2SGJGCJD4I=\n#    -----END CERTIFICATE-----\n',
            type: 'yaml',
          },
        },
      },
    ],
    package: {
      name: packageName,
      title: packageTitle,
      version: packageVersion,
    },
  });
};

interface AddEndpointIntegrationToAgentPolicyOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  agentPolicyId: string;
  name?: string;
}

/**
 * Adds Endpoint integration to the Fleet agent policy provided on input
 * @param kbnClient
 * @param log
 * @param agentPolicyId
 * @param name
 */
export const addEndpointIntegrationToAgentPolicy = async ({
  kbnClient,
  log,
  agentPolicyId,
  name = `${CURRENT_USERNAME} test policy`,
}: AddEndpointIntegrationToAgentPolicyOptions): Promise<PackagePolicy> => {
  const agentPolicy = await fetchAgentPolicy(kbnClient, agentPolicyId);

  log.verbose('Agent policy', agentPolicy);

  const integrationPolicies = agentPolicy.package_policies ?? [];

  for (const integrationPolicy of integrationPolicies) {
    if (integrationPolicy.package?.name === 'endpoint') {
      log.debug(
        `Returning existing Endpoint Integration Policy included in agent policy [${agentPolicyId}]`
      );
      log.verbose(integrationPolicy);

      return integrationPolicy;
    }
  }

  const {
    version: packageVersion,
    name: packageName,
    title: packageTitle,
  } = await getEndpointPackageInfo(kbnClient);

  const newIntegrationPolicy = await createIntegrationPolicy(kbnClient, {
    name,
    description: `Created by: ${__filename}`,
    namespace: 'default',
    policy_id: agentPolicyId,
    enabled: true,
    inputs: [
      {
        enabled: true,
        streams: [],
        type: 'ENDPOINT_INTEGRATION_CONFIG',
        config: {
          _config: {
            value: {
              type: 'endpoint',
              endpointConfig: {
                preset: 'EDRComplete',
              },
            },
          },
        },
      },
    ],
    package: {
      name: packageName,
      title: packageTitle,
      version: packageVersion,
    },
  });

  log.verbose(
    `New Endpoint integration policy created: Name[${name}], Id[${newIntegrationPolicy.id}]`
  );
  log.debug(newIntegrationPolicy);

  return newIntegrationPolicy;
};

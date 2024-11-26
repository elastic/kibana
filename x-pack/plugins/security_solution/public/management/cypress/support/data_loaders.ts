/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

import type { CasePostRequest } from '@kbn/cases-plugin/common';
import execa from 'execa';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import findUp from 'find-up';
// eslint-disable-next-line import/no-nodejs-modules
import { mkdir } from 'node:fs/promises';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';
import type { HostVmExecResponse } from '../../../../scripts/endpoint/common/types';
import type { IndexedEndpointHeartbeats } from '../../../../common/endpoint/data_loaders/index_endpoint_hearbeats';
import {
  deleteIndexedEndpointHeartbeats,
  indexEndpointHeartbeats,
} from '../../../../common/endpoint/data_loaders/index_endpoint_hearbeats';
import {
  getHostVmClient,
  createVm,
  generateVmName,
} from '../../../../scripts/endpoint/common/vm_services';
import { setupStackServicesUsingCypressConfig } from './common';
import type { KibanaKnownUserAccounts } from '../common/constants';
import { KIBANA_KNOWN_DEFAULT_ACCOUNTS } from '../common/constants';
import type { EndpointSecurityRoleNames } from '../../../../scripts/endpoint/common/roles_users';
import { SECURITY_SERVERLESS_ROLE_NAMES } from '../../../../scripts/endpoint/common/roles_users';
import type { LoadedRoleAndUser } from '../../../../scripts/endpoint/common/role_and_user_loader';
import { EndpointSecurityTestRolesLoader } from '../../../../scripts/endpoint/common/role_and_user_loader';
import {
  sendEndpointActionResponse,
  sendFleetActionResponse,
} from '../../../../scripts/endpoint/common/response_actions';
import type { DeleteAllEndpointDataResponse } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';
import { deleteAllEndpointData } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';
import { waitForEndpointToStreamData } from '../../../../scripts/endpoint/common/endpoint_metadata_services';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../scripts/endpoint/common/endpoint_host_services';
import {
  createAndEnrollEndpointHost,
  destroyEndpointHost,
  startEndpointHost,
  stopEndpointHost,
} from '../../../../scripts/endpoint/common/endpoint_host_services';
import type { IndexedEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_endpoint_policy_response';
import {
  deleteIndexedEndpointPolicyResponse,
  indexEndpointPolicyResponse,
} from '../../../../common/endpoint/data_loaders/index_endpoint_policy_response';
import type { ActionDetails, HostPolicyResponse } from '../../../../common/endpoint/types';
import type {
  IndexEndpointHostsCyTaskOptions,
  LoadUserAndRoleCyTaskOptions,
  CreateUserAndRoleCyTaskOptions,
  LogItTaskOptions,
} from '../types';
import type {
  DeletedIndexedEndpointRuleAlerts,
  IndexedEndpointRuleAlerts,
} from '../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import {
  deleteIndexedEndpointRuleAlerts,
  indexEndpointRuleAlerts,
} from '../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import type { IndexedHostsAndAlertsResponse } from '../../../../common/endpoint/index_data';
import { deleteIndexedHostsAndAlerts } from '../../../../common/endpoint/index_data';
import type { IndexedCase } from '../../../../common/endpoint/data_loaders/index_case';
import { deleteIndexedCase, indexCase } from '../../../../common/endpoint/data_loaders/index_case';
import {
  installSentinelOneAgent,
  S1Client,
} from '../../../../scripts/endpoint/sentinelone_host/common';
import {
  addSentinelOneIntegrationToAgentPolicy,
  deleteAgentPolicy,
  fetchAgentPolicyEnrollmentKey,
  getOrCreateDefaultAgentPolicy,
} from '../../../../scripts/endpoint/common/fleet_services';
import { startElasticAgentWithDocker } from '../../../../scripts/endpoint/common/elastic_agent_service';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
} from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { cyLoadEndpointDataHandler } from './plugin_handlers/endpoint_data_loader';
import type {
  CreateAndEnrollEndpointHostCIOptions,
  CreateAndEnrollEndpointHostCIResponse,
} from './create_and_enroll_endpoint_host_ci';
import { createAndEnrollEndpointHostCI } from './create_and_enroll_endpoint_host_ci';

/**
 * Test Role/User loader for cypress. Checks to see if running in serverless and handles it as appropriate
 */
class TestRoleAndUserLoader extends EndpointSecurityTestRolesLoader {
  constructor(
    protected readonly kbnClient: KbnClient,
    protected readonly logger: ToolingLog,
    private readonly isServerless: boolean
  ) {
    super(kbnClient, logger);
  }

  async load(
    name: EndpointSecurityRoleNames | KibanaKnownUserAccounts
  ): Promise<LoadedRoleAndUser> {
    // If its a known system account, then just exit here and use the default `changeme` password
    if (KIBANA_KNOWN_DEFAULT_ACCOUNTS[name as KibanaKnownUserAccounts]) {
      return {
        role: name,
        username: name,
        password: 'changeme',
      };
    }

    if (this.isServerless) {
      // If the username is not one that we support in serverless, then throw an error.
      if (!SECURITY_SERVERLESS_ROLE_NAMES[name as keyof typeof SECURITY_SERVERLESS_ROLE_NAMES]) {
        throw new Error(
          `username [${name}] is not valid when running in serverless. Valid values are: ${Object.keys(
            SECURITY_SERVERLESS_ROLE_NAMES
          ).join(', ')}`
        );
      }

      // Roles/users for serverless will be already present in the env, so just return the defaults creds
      return {
        role: name,
        username: name,
        password: 'changeme',
      };
    }

    return super.load(name as EndpointSecurityRoleNames);
  }
}

/**
 * Cypress plugin for adding data loading related `task`s
 *
 * @param on
 * @param config
 *
 * @see https://docs.cypress.io/api/plugins/writing-a-plugin
 */
export const dataLoaders = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): void => {
  // Env. variable is set by `cypress_serverless.config.ts`
  const isServerless = config.env.IS_SERVERLESS;
  const isCloudServerless = Boolean(config.env.CLOUD_SERVERLESS);
  const stackServicesPromise = setupStackServicesUsingCypressConfig(config);
  const roleAndUserLoaderPromise: Promise<TestRoleAndUserLoader> = stackServicesPromise.then(
    ({ kbnClient, log }) => {
      return new TestRoleAndUserLoader(kbnClient, log, isServerless);
    }
  );

  on('task', {
    logIt: async ({ level = 'info', data }: LogItTaskOptions): Promise<null> => {
      return stackServicesPromise
        .then(({ log }) => {
          log[level](data);
        })
        .then(() => null);
    },

    indexFleetEndpointPolicy: async ({
      policyName,
      endpointPackageVersion,
      agentPolicyName,
    }: {
      policyName: string;
      endpointPackageVersion?: string;
      agentPolicyName?: string;
    }) => {
      const { kbnClient, log } = await stackServicesPromise;
      return indexFleetEndpointPolicy(
        kbnClient,
        policyName,
        endpointPackageVersion,
        agentPolicyName,
        log
      );
    },

    deleteIndexedFleetEndpointPolicies: async (indexData: IndexedFleetEndpointPolicyResponse) => {
      const { kbnClient } = await stackServicesPromise;
      return deleteIndexedFleetEndpointPolicies(kbnClient, indexData);
    },

    indexCase: async (newCase: Partial<CasePostRequest> = {}): Promise<IndexedCase['data']> => {
      const { kbnClient } = await stackServicesPromise;
      const response = await indexCase(kbnClient, newCase);
      return response.data;
    },

    deleteIndexedCase: async (data: IndexedCase['data']): Promise<null> => {
      const { kbnClient } = await stackServicesPromise;
      await deleteIndexedCase(kbnClient, data);
      return null;
    },

    indexEndpointHosts: async (options: IndexEndpointHostsCyTaskOptions = {}) => {
      const { kbnClient, esClient, log } = await stackServicesPromise;
      const {
        count: numHosts,
        version,
        os,
        isolation,
        withResponseActions,
        numResponseActions,
        alertIds,
      } = options;

      return cyLoadEndpointDataHandler(esClient, kbnClient, log, {
        numHosts,
        version,
        os,
        isolation,
        withResponseActions,
        numResponseActions,
        alertIds,
        isServerless,
      });
    },

    deleteIndexedEndpointHosts: async (indexedData: IndexedHostsAndAlertsResponse) => {
      const { kbnClient, esClient } = await stackServicesPromise;
      return deleteIndexedHostsAndAlerts(esClient, kbnClient, indexedData);
    },

    indexEndpointHeartbeats: async (options: { count?: number; unbilledCount?: number }) => {
      const { esClient, log } = await setupStackServicesUsingCypressConfig(config);
      return (await indexEndpointHeartbeats(esClient, log, options.count, options.unbilledCount))
        .data;
    },

    deleteIndexedEndpointHeartbeats: async (
      data: IndexedEndpointHeartbeats['data']
    ): Promise<null> => {
      const { esClient } = await stackServicesPromise;
      await deleteIndexedEndpointHeartbeats(esClient, data);
      return null;
    },

    indexEndpointRuleAlerts: async (options: { endpointAgentId: string; count?: number }) => {
      const { esClient, log, kbnClient } = await stackServicesPromise;
      return (
        await indexEndpointRuleAlerts({
          ...options,
          esClient,
          kbnClient,
          log,
        })
      ).alerts;
    },

    deleteIndexedEndpointRuleAlerts: async (
      data: IndexedEndpointRuleAlerts['alerts']
    ): Promise<DeletedIndexedEndpointRuleAlerts> => {
      const { esClient, log } = await stackServicesPromise;
      return deleteIndexedEndpointRuleAlerts(esClient, data, log);
    },

    indexEndpointPolicyResponse: async (
      policyResponse: HostPolicyResponse
    ): Promise<IndexedEndpointPolicyResponse> => {
      const { esClient } = await stackServicesPromise;
      return indexEndpointPolicyResponse(esClient, policyResponse);
    },

    deleteIndexedEndpointPolicyResponse: async (
      indexedData: IndexedEndpointPolicyResponse
    ): Promise<null> => {
      const { esClient } = await stackServicesPromise;
      return deleteIndexedEndpointPolicyResponse(esClient, indexedData).then(() => null);
    },

    sendHostActionResponse: async (data: {
      action: ActionDetails;
      state: { state?: 'success' | 'failure' };
    }): Promise<null> => {
      const { esClient } = await stackServicesPromise;
      const fleetResponse = await sendFleetActionResponse(esClient, data.action, {
        state: data.state.state,
      });

      if (!fleetResponse.error) {
        await sendEndpointActionResponse(esClient, data.action, { state: data.state.state });
      }

      return null;
    },

    deleteAllEndpointData: async ({
      endpointAgentIds,
    }: {
      endpointAgentIds: string[];
    }): Promise<DeleteAllEndpointDataResponse> => {
      const { esClient, log } = await stackServicesPromise;
      return deleteAllEndpointData(esClient, log, endpointAgentIds, !isCloudServerless);
    },

    /**
     * Loads a user/role into Kibana. Used from `login()` task.
     * @param name
     */
    loadUserAndRole: async ({ name }: LoadUserAndRoleCyTaskOptions): Promise<LoadedRoleAndUser> => {
      return (await roleAndUserLoaderPromise).load(name);
    },

    /**
     * Creates a new Role/User
     */
    createUserAndRole: async ({
      role,
    }: CreateUserAndRoleCyTaskOptions): Promise<LoadedRoleAndUser> => {
      return (await roleAndUserLoaderPromise).create(role);
    },
  });
};

export const dataLoadersForRealEndpoints = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): void => {
  const stackServicesPromise = setupStackServicesUsingCypressConfig(config);

  on('task', {
    createSentinelOneHost: async () => {
      if (!process.env.CYPRESS_SENTINELONE_URL || !process.env.CYPRESS_SENTINELONE_TOKEN) {
        throw new Error('CYPRESS_SENTINELONE_URL and CYPRESS_SENTINELONE_TOKEN must be set');
      }

      const { log } = await stackServicesPromise;
      const s1Client = new S1Client({
        url: process.env.CYPRESS_SENTINELONE_URL,
        apiToken: process.env.CYPRESS_SENTINELONE_TOKEN,
        log,
      });

      const vmName = generateVmName('sentinelone');

      const hostVm = await createVm({
        type: 'multipass',
        name: vmName,
        log,
        memory: '2G',
        disk: '10G',
      });

      const s1Info = await installSentinelOneAgent({
        hostVm,
        log,
        s1Client,
      });

      // wait 30s before running malicious action
      await new Promise((resolve) => setTimeout(resolve, 30000));

      // nslookup triggers an alert on S1
      await getHostVmClient(vmName).exec('nslookup amazon.com');

      log.info(`Done!

${hostVm.info()}

SentinelOne Agent Status:
${s1Info.status}
`);

      return hostVm;
    },

    createSentinelOneAgentPolicy: async () => {
      if (!process.env.CYPRESS_SENTINELONE_URL || !process.env.CYPRESS_SENTINELONE_TOKEN) {
        throw new Error('CYPRESS_SENTINELONE_URL and CYPRESS_SENTINELONE_TOKEN must be set');
      }

      const { log, kbnClient } = await stackServicesPromise;
      const agentPolicyId = (await getOrCreateDefaultAgentPolicy({ kbnClient, log })).id;

      await addSentinelOneIntegrationToAgentPolicy({
        kbnClient,
        log,
        agentPolicyId,
        consoleUrl: process.env.CYPRESS_SENTINELONE_URL,
        apiToken: process.env.CYPRESS_SENTINELONE_TOKEN,
      });

      const enrollmentToken = await fetchAgentPolicyEnrollmentKey(kbnClient, agentPolicyId);

      const elasticAgent = await startElasticAgentWithDocker({
        kbnClient,
        logger: log,
        enrollmentToken,
      });

      return {
        ...elasticAgent,
        policyId: agentPolicyId,
      };
    },

    deleteAgentPolicy: async (agentPolicyId: string) => {
      const { kbnClient } = await stackServicesPromise;

      await deleteAgentPolicy(kbnClient, agentPolicyId);
    },

    createEndpointHost: async (
      options: Omit<CreateAndEnrollEndpointHostCIOptions, 'log' | 'kbnClient'>
    ): Promise<CreateAndEnrollEndpointHostCIResponse> => {
      const { kbnClient, log, esClient } = await stackServicesPromise;
      let retryAttempt = 0;
      const attemptCreateEndpointHost =
        async (): Promise<CreateAndEnrollEndpointHostCIResponse> => {
          try {
            log.info(`Creating endpoint host, attempt ${retryAttempt}`);
            const newHost = process.env.CI
              ? await createAndEnrollEndpointHostCI({
                  useClosestVersionMatch: true,
                  ...options,
                  log,
                  kbnClient,
                  esClient,
                })
              : await createAndEnrollEndpointHost({
                  useClosestVersionMatch: true,
                  ...options,
                  log,
                  kbnClient,
                });
            await waitForEndpointToStreamData(kbnClient, newHost.agentId, 360000);
            return newHost;
          } catch (err) {
            log.info(`Caught error when setting up the agent: ${err}`);
            if (retryAttempt === 0 && err.agentId) {
              retryAttempt++;
              await destroyEndpointHost(kbnClient, {
                hostname: err.hostname || '', // No hostname in CI env for vagrant
                agentId: err.agentId,
              });
              log.info(`Deleted endpoint host ${err.agentId} and retrying`);
              return attemptCreateEndpointHost();
            } else {
              log.info(
                `${retryAttempt} attempts of creating endpoint host failed, reason for the last failure was ${err}`
              );
              throw err;
            }
          }
        };

      return attemptCreateEndpointHost();
    },

    destroyEndpointHost: async (
      createdHost: CreateAndEnrollEndpointHostResponse
    ): Promise<null> => {
      const { kbnClient } = await stackServicesPromise;
      return destroyEndpointHost(kbnClient, createdHost).then(() => null);
    },

    execCommandOnHost: async ({
      hostname,
      command,
    }: {
      hostname: string;
      command: string;
    }): Promise<HostVmExecResponse> => {
      const { log } = await stackServicesPromise;
      return getHostVmClient(hostname, undefined, undefined, log).exec(command);
    },

    createFileOnEndpoint: async ({
      hostname,
      path: filePath,
      content,
    }: {
      hostname: string;
      path: string;
      content: string;
    }): Promise<null> => {
      // --------- FIXME:PT DO NOT COMMIT TO MAIN - dev debug only
      const { log } = await stackServicesPromise;

      log.info(`---------------------------


NODE RUNTIME ENV.:

${Object.entries(process.env)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n')}



WHERE AM I:
      ${(await execa.command('pwd').catch((e) => ({ stdout: `ERROR: ${e.message}` }))).stdout}



WHATS INSIDE OF ${process.env.PWD}/target:

${
  (
    await execa
      .command(`find ${process.env.PWD}/target`)
      .catch((e) => ({ stdout: `ERROR: ${e.message}` }))
  ).stdout
}


WHATS INSIDE OF ${process.env.PWD.substring(0, process.env.PWD.indexOf('/kibana/'))}/kibana/target:

${
  (
    await execa
      .command(
        `find ${process.env.PWD.substring(0, process.env.PWD.indexOf('/kibana/'))}/kibana/target`
      )
      .catch((e) => ({ stdout: `ERROR: ${e.message}` }))
  ).stdout
}






---------------------------
`);

      // --------- FIXME:PT DO NOT COMMIT TO MAIN - dev debug only

      await getHostVmClient(hostname).exec(`echo ${content} > ${filePath}`);
      return null;
    },

    captureHostVmAgentDiagnostics: async ({ hostname }) => {
      const { log } = await stackServicesPromise;

      log.info(`Capturing agent diagnostics for host VM [${hostname}]`);

      const vmClient = getHostVmClient(hostname, undefined, undefined, log);
      const fileName = `elastic-agent-diagnostics-${hostname}-${new Date()
        .toISOString()
        .replace(/:/g, '.')}.zip`;
      const vmDiagnosticsFile = `/tmp/${fileName}`;
      const kibanaDir = process.env.KIBANA_DIR ?? (await findUp('kibana', { type: 'directory' }));
      const localDiagnosticsFile = `${kibanaDir}/target/test_failures/${fileName}`;

      await mkdir(path.dirname(localDiagnosticsFile), { recursive: true });

      // generate diagnostics file on the host and then download it
      await vmClient.exec(
        `sudo /opt/Elastic/Agent/elastic-agent diagnostics --file ${vmDiagnosticsFile}`
      );
      return vmClient.download(vmDiagnosticsFile, localDiagnosticsFile).then((response) => {
        log.info(`Agent diagnostic file for host [${hostname}] has been downloaded and is available at:
  ${response.filePath}
`);
        return response;
      });
    },

    uploadFileToEndpoint: async ({
      hostname,
      srcPath,
      destPath = '.',
    }: {
      hostname: string;
      srcPath: string;
      destPath: string;
    }): Promise<null> => {
      await getHostVmClient(hostname).transfer(srcPath, destPath);
      return null;
    },

    installPackagesOnEndpoint: async ({
      hostname,
      packages,
    }: {
      hostname: string;
      packages: string[];
    }): Promise<null> => {
      await execa(`multipass`, [
        'exec',
        hostname,
        '--',
        'sh',
        '-c',
        `sudo apt install -y ${packages.join(' ')}`,
      ]);
      return null;
    },

    readZippedFileContentOnEndpoint: async ({
      hostname,
      path: filePath,
      password,
    }: {
      hostname: string;
      path: string;
      password?: string;
    }): Promise<string> => {
      return (
        await getHostVmClient(hostname).exec(
          `unzip -p ${password ? `-P ${password} ` : ''}${filePath}`
        )
      ).stdout;
    },

    stopEndpointHost: async (hostName) => {
      await stopEndpointHost(hostName);
      return null;
    },

    startEndpointHost: async (hostName) => {
      await startEndpointHost(hostName);
      return null;
    },
  });
};

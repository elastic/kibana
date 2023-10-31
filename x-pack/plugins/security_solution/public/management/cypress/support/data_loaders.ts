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
import type { KibanaKnownUserAccounts } from '../common/constants';
import { KIBANA_KNOWN_DEFAULT_ACCOUNTS } from '../common/constants';
import type { EndpointSecurityRoleNames } from '../../../../scripts/endpoint/common/roles_users';
import { SECURITY_SERVERLESS_ROLE_NAMES } from '../../../../scripts/endpoint/common/roles_users';
import type { LoadedRoleAndUser } from '../../../../scripts/endpoint/common/role_and_user_loader';
import { EndpointSecurityTestRolesLoader } from '../../../../scripts/endpoint/common/role_and_user_loader';
import { startRuntimeServices } from '../../../../scripts/endpoint/endpoint_agent_runner/runtime';
import { runFleetServerIfNeeded } from '../../../../scripts/endpoint/endpoint_agent_runner/fleet_server';
import {
  sendEndpointActionResponse,
  sendFleetActionResponse,
} from '../../../../scripts/endpoint/common/response_actions';
import type { DeleteAllEndpointDataResponse } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';
import { deleteAllEndpointData } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';
import { waitForEndpointToStreamData } from '../../../../scripts/endpoint/common/endpoint_metadata_services';
import type {
  CreateAndEnrollEndpointHostOptions,
  CreateAndEnrollEndpointHostResponse,
} from '../../../../scripts/endpoint/common/endpoint_host_services';
import {
  createAndEnrollEndpointHost,
  destroyEndpointHost,
  startEndpointHost,
  stopEndpointHost,
  VAGRANT_CWD,
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
import { createRuntimeServices } from '../../../../scripts/endpoint/common/stack_services';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
} from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { cyLoadEndpointDataHandler } from './plugin_handlers/endpoint_data_loader';

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

  const stackServicesPromise = createRuntimeServices({
    kibanaUrl: config.env.KIBANA_URL,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    fleetServerUrl: config.env.FLEET_SERVER_URL,
    username: config.env.KIBANA_USERNAME,
    password: config.env.KIBANA_PASSWORD,
    esUsername: config.env.ELASTICSEARCH_USERNAME,
    esPassword: config.env.ELASTICSEARCH_PASSWORD,
    asSuperuser: true,
  });

  const roleAndUserLoaderPromise: Promise<TestRoleAndUserLoader> = stackServicesPromise.then(
    ({ kbnClient, log }) => {
      return new TestRoleAndUserLoader(kbnClient, log, isServerless);
    }
  );

  on('task', {
    indexFleetEndpointPolicy: async ({
      policyName,
      endpointPackageVersion,
      agentPolicyName,
    }: {
      policyName: string;
      endpointPackageVersion?: string;
      agentPolicyName?: string;
    }) => {
      const { kbnClient } = await stackServicesPromise;
      return indexFleetEndpointPolicy(
        kbnClient,
        policyName,
        endpointPackageVersion,
        agentPolicyName
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
      });
    },

    deleteIndexedEndpointHosts: async (indexedData: IndexedHostsAndAlertsResponse) => {
      const { kbnClient, esClient } = await stackServicesPromise;
      return deleteIndexedHostsAndAlerts(esClient, kbnClient, indexedData);
    },

    indexEndpointRuleAlerts: async (options: { endpointAgentId: string; count?: number }) => {
      const { esClient, log } = await stackServicesPromise;
      return (
        await indexEndpointRuleAlerts({
          ...options,
          esClient,
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
      const { esClient } = await stackServicesPromise;
      return deleteAllEndpointData(esClient, endpointAgentIds);
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
  let fleetServerContainerId: string | undefined;

  const stackServicesPromise = createRuntimeServices({
    kibanaUrl: config.env.KIBANA_URL,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    fleetServerUrl: config.env.FLEET_SERVER_URL,
    username: config.env.KIBANA_USERNAME,
    password: config.env.KIBANA_PASSWORD,
    esUsername: config.env.ELASTICSEARCH_USERNAME,
    esPassword: config.env.ELASTICSEARCH_PASSWORD,
    asSuperuser: true,
  });

  on('before:run', async () => {
    await startRuntimeServices({
      kibanaUrl: config.env.KIBANA_URL,
      elasticUrl: config.env.ELASTICSEARCH_URL,
      fleetServerUrl: config.env.FLEET_SERVER_URL,
      username: config.env.KIBANA_USERNAME,
      password: config.env.KIBANA_PASSWORD,
      asSuperuser: true,
    });
    const data = await runFleetServerIfNeeded();
    fleetServerContainerId = data?.fleetServerContainerId;
  });

  on('after:run', async () => {
    const { log } = await stackServicesPromise;
    if (fleetServerContainerId) {
      try {
        execa.sync('docker', ['kill', fleetServerContainerId]);
      } catch (error) {
        log.error(error);
      }
    }
  });

  on('task', {
    createEndpointHost: async (
      options: Omit<CreateAndEnrollEndpointHostOptions, 'log' | 'kbnClient'>
    ): Promise<CreateAndEnrollEndpointHostResponse> => {
      const { kbnClient, log } = await stackServicesPromise;

      let retryAttempt = 0;
      const attemptCreateEndpointHost = async (): Promise<CreateAndEnrollEndpointHostResponse> => {
        try {
          log.info(`Creating endpoint host, attempt ${retryAttempt}`);
          const newHost = await createAndEnrollEndpointHost({
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

    createFileOnEndpoint: async ({
      hostname,
      path,
      content,
    }: {
      hostname: string;
      path: string;
      content: string;
    }): Promise<null> => {
      if (process.env.CI) {
        await execa('vagrant', ['ssh', '--', `echo ${content} > ${path}`], {
          env: {
            VAGRANT_CWD,
          },
        });
      } else {
        await execa(`multipass`, ['exec', hostname, '--', 'sh', '-c', `echo ${content} > ${path}`]);
      }
      return null;
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
      if (process.env.CI) {
        await execa('vagrant', ['upload', srcPath, destPath], {
          env: {
            VAGRANT_CWD,
          },
        });
      } else {
        await execa(`multipass`, ['transfer', srcPath, `${hostname}:${destPath}`]);
      }

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
      path,
      password,
    }: {
      hostname: string;
      path: string;
      password?: string;
    }): Promise<string> => {
      let result;

      if (process.env.CI) {
        result = await execa(
          `vagrant`,
          ['ssh', '--', `unzip -p ${password ? `-P ${password} ` : ''}${path}`],
          {
            env: {
              VAGRANT_CWD,
            },
          }
        );
      } else {
        result = await execa(`multipass`, [
          'exec',
          hostname,
          '--',
          'sh',
          '-c',
          `unzip -p ${password ? `-P ${password} ` : ''}${path}`,
        ]);
      }

      return result.stdout;
    },

    stopEndpointHost: async (hostName) => {
      return stopEndpointHost(hostName);
    },

    startEndpointHost: async (hostName) => {
      return startEndpointHost(hostName);
    },
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import execa from 'execa';
import chalk from 'chalk';
import assert from 'assert';
import type { AgentPolicy, CreateAgentPolicyResponse, Output } from '@kbn/fleet-plugin/common';
import {
  AGENT_POLICY_API_ROUTES,
  API_VERSIONS,
  FLEET_SERVER_PACKAGE,
  FLEET_SERVER_SERVERS_INDEX,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import type {
  FleetServerHost,
  GetOneOutputResponse,
  PutOutputRequest,
} from '@kbn/fleet-plugin/common/types';
import type {
  PostFleetServerHostsRequest,
  PostFleetServerHostsResponse,
} from '@kbn/fleet-plugin/common/types/rest_spec/fleet_server_hosts';
import {
  fleetServerHostsRoutesService,
  outputRoutesService,
} from '@kbn/fleet-plugin/common/services';
import axios from 'axios';
import * as https from 'https';
import {
  CA_TRUSTED_FINGERPRINT,
  FLEET_SERVER_CERT_PATH,
  FLEET_SERVER_KEY_PATH,
  fleetServerDevServiceAccount,
} from '@kbn/dev-utils';
import { maybeCreateDockerNetwork, SERVERLESS_NODES, verifyDockerInstalled } from '@kbn/es';
import { resolve } from 'path';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  createToolingLogger,
  RETRYABLE_TRANSIENT_ERRORS,
  retryOnError,
} from '../../../../common/endpoint/data_loaders/utils';
import { isServerlessKibanaFlavor } from '../stack_services';
import type { FormattedAxiosError } from '../format_axios_error';
import { catchAxiosErrorFormatAndThrow } from '../format_axios_error';
import {
  fetchFleetOutputs,
  fetchFleetServerHostList,
  fetchFleetServerUrl,
  fetchIntegrationPolicyList,
  generateFleetServiceToken,
  getAgentVersionMatchingCurrentStack,
  getFleetElasticsearchOutputHost,
  waitForHostToEnroll,
} from '../fleet_services';
import { dump } from '../../endpoint_agent_runner/utils';
import { getLocalhostRealIp } from '../network_services';
import { isLocalhost } from '../is_localhost';

export const FLEET_SERVER_CUSTOM_CONFIG = resolve(__dirname, './fleet_server.yml');

interface StartedServer {
  /** The type of virtualization used to start the server */
  type: 'docker';
  /** The ID of the server */
  id: string;
  /** The name of the server */
  name: string;
  /** The url (including port) to the server */
  url: string;
  /** Stop server */
  stop: () => Promise<void>;
  /** Any information about the server */
  info?: string;
}

interface StartFleetServerOptions {
  kbnClient: KbnClient;
  logger: ToolingLog;
  /** Policy ID that should be used to enroll the fleet-server agent */
  policy?: string;
  /** Agent version */
  version?: string;
  /** Will start fleet-server even if its detected that it is already running */
  force?: boolean;
  /** The port number that will be used by fleet-server to listen for requests */
  port?: number;
}

interface StartedFleetServer extends StartedServer {
  /** The policy id that the fleet-server agent is running with */
  policyId: string;
}

export const startFleetServer = async ({
  kbnClient,
  logger,
  policy,
  version,
  force = false,
  port = 8220,
}: StartFleetServerOptions): Promise<StartedFleetServer> => {
  logger.info(`Starting Fleet Server and connecting it to Kibana`);

  return logger.indent(4, async () => {
    const isServerless = await isServerlessKibanaFlavor(kbnClient);

    // Check if fleet already running if `force` is false
    if (!force && (await isFleetServerRunning(kbnClient))) {
      throw new Error(
        `Fleet server is already configured and running for this instance of Kibana.\n(Use 'force' option to bypass this error)`
      );
    }

    const policyId =
      policy || !isServerless ? await getOrCreateFleetServerAgentPolicyId(kbnClient, logger) : '';
    const serviceToken = isServerless ? '' : await generateFleetServiceToken(kbnClient, logger);
    const startedFleetServer = await startFleetServerWithDocker({
      kbnClient,
      logger,
      policyId,
      version,
      port,
      serviceToken,
    });

    return {
      ...startedFleetServer,
      policyId,
    };
  });
};

const getOrCreateFleetServerAgentPolicyId = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<string> => {
  log.info(`Retrieving/creating Fleet Server agent policy`);

  return log.indent(4, async () => {
    const existingFleetServerIntegrationPolicy = await fetchIntegrationPolicyList(kbnClient, {
      perPage: 1,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "${FLEET_SERVER_PACKAGE}"`,
    }).then((response) => response.items[0]);

    if (existingFleetServerIntegrationPolicy) {
      log.verbose(
        `Found existing Fleet Server Policy: ${JSON.stringify(
          existingFleetServerIntegrationPolicy,
          null,
          2
        )}`
      );
      log.info(
        `Using existing Fleet Server agent policy id: ${existingFleetServerIntegrationPolicy.policy_id}`
      );

      return existingFleetServerIntegrationPolicy.policy_id;
    }

    log.info(`Creating new Fleet Server policy`);

    const createdFleetServerPolicy: AgentPolicy = await kbnClient
      .request<CreateAgentPolicyResponse>({
        method: 'POST',
        path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
        headers: { 'elastic-api-version': '2023-10-31' },
        body: {
          name: `Fleet Server policy (${Math.random().toString(32).substring(2)})`,
          description: `Created by CLI Tool via: ${__filename}`,
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          // This will ensure the Fleet Server integration policy
          // is also created and added to the agent policy
          has_fleet_server: true,
        },
      })
      .then((response) => response.data.item)
      .catch(catchAxiosErrorFormatAndThrow);

    log.info(
      `Agent Policy created: ${createdFleetServerPolicy.name} (${createdFleetServerPolicy.id})`
    );
    log.verbose(createdFleetServerPolicy);

    return createdFleetServerPolicy.id;
  });
};

interface StartFleetServerWithDockerOptions {
  kbnClient: KbnClient;
  logger: ToolingLog;
  /** The agent policy id. Required for non-serverless env. */
  policyId?: string;
  /** The service token for fleet server. Required for non-serverless env. */
  serviceToken?: string;
  version?: string;
  port?: number;
}

const startFleetServerWithDocker = async ({
  kbnClient,
  logger: log,
  policyId = '',
  serviceToken = '',
  version,
  port = 8220,
}: StartFleetServerWithDockerOptions): Promise<StartedServer> => {
  await verifyDockerInstalled(log);

  let agentVersion = version || (await getAgentVersionMatchingCurrentStack(kbnClient));

  log.info(`Starting a new fleet server using Docker (version: ${agentVersion})`);

  const response: StartedServer = await log.indent(4, async () => {
    const isServerless = await isServerlessKibanaFlavor(kbnClient);
    const localhostRealIp = getLocalhostRealIp();
    const fleetServerUrl = `https://${localhostRealIp}:${port}`;
    const esURL = new URL(await getFleetElasticsearchOutputHost(kbnClient));
    const containerName = `dev-fleet-server.${port}`;
    const hostname = `dev-fleet-server.${port}.${Math.random().toString(32).substring(2, 6)}`;
    let containerId = '';
    let fleetServerVersionInfo = '';

    if (isLocalhost(esURL.hostname)) {
      esURL.hostname = localhostRealIp;
    }

    if (isServerless) {
      log.info(`Kibana running in serverless mode.
  - will install/run standalone Fleet Server
  - version adjusted to [latest] from [${agentVersion}]`);

      agentVersion = 'latest';
      await maybeCreateDockerNetwork(log);
    } else {
      assert.ok(!!policyId, '`policyId` is required');
      assert.ok(!!serviceToken, '`serviceToken` is required');
    }

    try {
      const dockerArgs = isServerless
        ? getFleetServerStandAloneDockerArgs({
            containerName,
            hostname,
            port,
            esUrl: esURL.toString(),
            agentVersion,
          })
        : getFleetServerManagedDockerArgs({
            containerName,
            hostname,
            port,
            serviceToken,
            policyId,
            agentVersion,
            esUrl: esURL.toString(),
          });

      await execa('docker', ['kill', containerName])
        .then(() => {
          log.verbose(
            `Killed an existing container with name [${containerName}]. New one will be started.`
          );
        })
        .catch((error) => {
          if (!/no such container/i.test(error.message)) {
            log.verbose(`Attempt to kill currently running fleet-server container with name [${containerName}] was unsuccessful:
      ${error}`);
          }
        });

      log.verbose(`docker arguments:\n${dockerArgs.join(' ')}`);

      containerId = (await execa('docker', dockerArgs)).stdout;

      log.info(`Fleet server started`);

      if (!isServerless) {
        await addFleetServerHostToFleetSettings(kbnClient, log, fleetServerUrl);
      }

      await updateFleetElasticsearchOutputHostNames(kbnClient, log);

      if (isServerless) {
        log.info(`Waiting for server to register with Elasticsearch`);

        await waitForFleetServerToRegisterWithElasticsearch(kbnClient, hostname, 120000);
      } else {
        log.info('Waiting for server to show up in Kibana Fleet');

        const fleetServerAgent = await waitForHostToEnroll(kbnClient, hostname, 120000);

        log.verbose(`Fleet server enrolled agent:\n${JSON.stringify(fleetServerAgent, null, 2)}`);
      }

      fleetServerVersionInfo = (
        await execa('docker', [
          'exec',
          containerName,
          '/bin/bash',
          '-c',
          './elastic-agent version',
        ]).catch((err) => {
          log.verbose(`Failed to retrieve agent version information from running instance.`, err);
          return { stdout: 'Unable to retrieve version information' };
        })
      ).stdout;
    } catch (error) {
      log.error(dump(error));
      throw error;
    }

    const info = `Container Name: ${containerName}
Container Id:   ${containerId}
Fleet-server version:
    ${fleetServerVersionInfo.replace(/\n/g, '\n    ')}

View running output:  ${chalk.cyan(`docker attach ---sig-proxy=false ${containerName}`)}
Shell access:         ${chalk.cyan(`docker exec -it ${containerName} /bin/bash`)}
Kill container:       ${chalk.cyan(`docker kill ${containerId}`)}
  `;

    return {
      type: 'docker',
      name: containerName,
      id: containerId,
      url: fleetServerUrl,
      info,
      stop: async () => {
        await execa('docker', ['kill', containerId]);
      },
    };
  });

  log.info(`Done. Fleet server up and running`);

  return response;
};

interface GetFleetServerManagedDockerArgsOptions {
  containerName: string;
  esUrl: string;
  serviceToken: string;
  policyId: string;
  port: number;
  agentVersion: string;
  /** The hostname. Defaults to `containerName` */
  hostname?: string;
}

const getFleetServerManagedDockerArgs = ({
  hostname,
  port,
  serviceToken,
  esUrl,
  containerName,
  agentVersion,
  policyId,
}: GetFleetServerManagedDockerArgsOptions): string[] => {
  return [
    'run',

    '--restart',
    'no',

    '--add-host',
    'host.docker.internal:host-gateway',

    '--rm',

    '--detach',

    '--name',
    containerName,

    // The container's hostname will appear in Fleet when the agent enrolls
    '--hostname',
    hostname || containerName,

    '--env',
    'FLEET_SERVER_ENABLE=1',

    '--env',
    `FLEET_SERVER_ELASTICSEARCH_HOST=${esUrl}`,

    '--env',
    `FLEET_SERVER_SERVICE_TOKEN=${serviceToken}`,

    '--env',
    `FLEET_SERVER_POLICY=${policyId}`,

    '--publish',
    `${port}:8220`,

    `docker.elastic.co/beats/elastic-agent:${agentVersion}`,
  ];
};

type GetFleetServerStandAloneDockerArgsOptions = Pick<
  GetFleetServerManagedDockerArgsOptions,
  'esUrl' | 'hostname' | 'containerName' | 'port' | 'agentVersion'
>;

const getFleetServerStandAloneDockerArgs = ({
  containerName,
  hostname,
  esUrl,
  agentVersion,
  port,
}: GetFleetServerStandAloneDockerArgsOptions): string[] => {
  const esURL = new URL(esUrl);
  esURL.hostname = SERVERLESS_NODES[0].name;

  return [
    'run',

    '--restart',
    'no',

    '--net',
    'elastic',

    '--add-host',
    'host.docker.internal:host-gateway',

    '--rm',
    '--detach',

    '--name',
    containerName,

    // The hostname will appear in Fleet when the agent enrolls
    '--hostname',
    hostname || containerName,

    '--env',
    'FLEET_SERVER_CERT=/fleet-server.crt',

    '--env',
    'FLEET_SERVER_CERT_KEY=/fleet-server.key',

    '--env',
    `ELASTICSEARCH_HOSTS=${esURL.toString()}`,

    '--env',
    `ELASTICSEARCH_SERVICE_TOKEN=${fleetServerDevServiceAccount.token}`,

    '--env',
    `ELASTICSEARCH_CA_TRUSTED_FINGERPRINT=${CA_TRUSTED_FINGERPRINT}`,

    '--volume',
    `${FLEET_SERVER_CERT_PATH}:/fleet-server.crt`,

    '--volume',
    `${FLEET_SERVER_KEY_PATH}:/fleet-server.key`,

    '--volume',
    `${FLEET_SERVER_CUSTOM_CONFIG}:/etc/fleet-server.yml:ro`,

    '--publish',
    `${port}:8220`,

    `docker.elastic.co/observability-ci/fleet-server:${agentVersion}`,
  ];
};

const addFleetServerHostToFleetSettings = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  fleetServerHostUrl: string
): Promise<FleetServerHost> => {
  log.info(`Updating Fleet with new fleet server host: ${fleetServerHostUrl}`);

  return log.indent(4, async () => {
    try {
      const exitingFleetServerHostList = await fetchFleetServerHostList(kbnClient);

      // If the fleet server URL is already configured, then do nothing and exit
      for (const fleetServerEntry of exitingFleetServerHostList.items) {
        if (fleetServerEntry.host_urls.includes(fleetServerHostUrl)) {
          log.info('No update needed. Fleet server host URL already defined in fleet settings.');
          return fleetServerEntry;
        }
      }

      const newFleetHostEntry: PostFleetServerHostsRequest['body'] = {
        name: `Dev fleet server running on localhost`,
        host_urls: [fleetServerHostUrl],
        is_default: !exitingFleetServerHostList.total,
      };

      const { item } = await kbnClient
        .request<PostFleetServerHostsResponse>({
          method: 'POST',
          path: fleetServerHostsRoutesService.getCreatePath(),
          headers: {
            'elastic-api-version': API_VERSIONS.public.v1,
          },
          body: newFleetHostEntry,
        })
        .catch(catchAxiosErrorFormatAndThrow)
        .catch((error: FormattedAxiosError) => {
          if (
            error.response.status === 403 &&
            ((error.response?.data?.message as string) ?? '').includes('disabled')
          ) {
            log.error(`Attempt to update fleet server host URL in fleet failed with [403: ${
              error.response.data.message
            }].

  ${chalk.red('Are you running this utility against a Serverless project?')}
  If so, the following entry should be added to your local
  'config/serverless.[project_type].dev.yml' (ex. 'serverless.security.dev.yml'):

  ${chalk.bold(chalk.cyan('xpack.fleet.internal.fleetServerStandalone: false'))}

  `);
          }

          throw error;
        })
        .then((response) => response.data);

      log.verbose(item);
      log.info(`Fleet settings updated with fleet host URL successful`);
      return item;
    } catch (error) {
      log.error(dump(error));
      throw error;
    }
  });
};

const updateFleetElasticsearchOutputHostNames = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<void> => {
  log.info('Checking if Fleet output for Elasticsearch needs to be updated');

  return log.indent(4, async () => {
    try {
      const localhostRealIp = getLocalhostRealIp();
      const fleetOutputs = await fetchFleetOutputs(kbnClient);

      // make sure that all ES hostnames are using localhost real IP
      for (const { id, ...output } of fleetOutputs.items) {
        if (output.type === 'elasticsearch') {
          if (output.hosts) {
            let needsUpdating = false;
            const updatedHosts: Output['hosts'] = [];

            for (const host of output.hosts) {
              const hostURL = new URL(host);

              if (isLocalhost(hostURL.hostname)) {
                needsUpdating = true;
                hostURL.hostname = localhostRealIp;
                updatedHosts.push(hostURL.toString());

                log.verbose(
                  `Fleet Settings for Elasticsearch Output [Name: ${
                    output.name
                  } (id: ${id})]: Host [${host}] updated to [${hostURL.toString()}]`
                );
              } else {
                updatedHosts.push(host);
              }
            }

            if (needsUpdating) {
              const update: PutOutputRequest['body'] = {
                ...(output as PutOutputRequest['body']), // cast needed to quite TS - looks like the types for Output in fleet differ a bit between create/update
                hosts: updatedHosts,
              };

              log.info(`Updating Fleet Settings for Output [${output.name} (${id})]`);

              await kbnClient
                .request<GetOneOutputResponse>({
                  method: 'PUT',
                  headers: { 'elastic-api-version': '2023-10-31' },
                  path: outputRoutesService.getUpdatePath(id),
                  body: update,
                })
                .catch(catchAxiosErrorFormatAndThrow);
            }
          }
        }
      }
    } catch (error) {
      log.error(dump(error));
      throw error;
    }
  });
};

/**
 * Checks to see if Fleet Server is setup with Fleet and if so, check to see if that
 * server is up and running by calling its status api
 * @param kbnClient
 * @param log
 */
export const isFleetServerRunning = async (
  kbnClient: KbnClient,
  log: ToolingLog = createToolingLogger()
): Promise<boolean> => {
  const fleetServerUrl = await fetchFleetServerUrl(kbnClient);

  if (!fleetServerUrl) {
    return false;
  }

  const url = new URL(fleetServerUrl);
  url.pathname = '/api/status';

  return axios
    .request({
      method: 'GET',
      url: url.toString(),
      responseType: 'json',
      // Custom agent to ensure we don't get cert errors
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    })
    .then((response) => {
      log.verbose(`Fleet server is up and running as [${fleetServerUrl}]`, response.data);
      return true;
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .catch((e) => {
      log.verbose(`Fleet server not up. Attempt to call [${url.toString()}] failed with:`, e);
      return false;
    });
};

/**
 * Checks and waits until the given fleet server hostname has been registered into elasticsearch.
 * This check can be used when enrolling a standalone fleet-server, since those would not show up
 * in Kibana's Fleet UI.
 */
const waitForFleetServerToRegisterWithElasticsearch = async (
  kbnClient: KbnClient,
  fleetServerHostname: string,
  timeoutMs: number = 30000
): Promise<void> => {
  const started = new Date();
  const hasTimedOut = (): boolean => {
    const elapsedTime = Date.now() - started.getTime();
    return elapsedTime > timeoutMs;
  };
  let found = false;

  while (!found && !hasTimedOut()) {
    found = await retryOnError(async () => {
      const fleetServerRecord = await kbnClient
        .request<estypes.SearchResponse>({
          method: 'POST',
          path: '/api/console/proxy',
          query: {
            path: `${FLEET_SERVER_SERVERS_INDEX}/_search`,
            method: 'GET',
          },
          body: {
            query: {
              bool: {
                filter: [
                  {
                    term: {
                      'host.name': fleetServerHostname,
                    },
                  },
                ],
              },
            },
          },
        })
        .then((response) => response.data)
        .catch(catchAxiosErrorFormatAndThrow);

      return (fleetServerRecord.hits.total as estypes.SearchTotalHits).value === 1;
    }, RETRYABLE_TRANSIENT_ERRORS);

    if (!found) {
      // sleep and check again
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (!found) {
    throw new Error(
      `Timed out waiting for fleet server [${fleetServerHostname}] to register with Elasticsarch`
    );
  }
};

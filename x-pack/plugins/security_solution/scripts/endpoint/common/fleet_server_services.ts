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
import type { AgentPolicy, CreateAgentPolicyResponse, Output } from '@kbn/fleet-plugin/common';
import {
  AGENT_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  API_VERSIONS,
  FLEET_SERVER_PACKAGE,
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
import type { FormattedAxiosError } from './format_axios_error';
import { catchAxiosErrorFormatAndThrow } from './format_axios_error';
import {
  fetchFleetOutputs,
  fetchFleetServerUrl,
  fetchIntegrationPolicyList,
  generateFleetServiceToken,
  getAgentVersionMatchingCurrentStack,
  getFleetElasticsearchOutputHost,
  waitForHostToEnroll,
} from './fleet_services';
import { dump } from '../endpoint_agent_runner/utils';
import { getLocalhostRealIp } from './localhost_services';
import { isLocalhost } from './is_localhost';

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

  let policyId = policy ?? '';

  // Check if fleet already running if `force` is false
  if (!force) {
    const currentFleetServerUrl = await fetchFleetServerUrl(kbnClient);

    // TODO: actually ping the server to ensure its up and running

    if (currentFleetServerUrl) {
      throw new Error(
        `Fleet server seems to already be configured for this instance of Kibana. (Use 'force' option to bypass this error)`
      );
    }
  }

  if (!policyId) {
    policyId = await getOrCreateFleetServerAgentPolicyId(kbnClient, logger);
  }

  const serviceToken = await generateFleetServiceToken(kbnClient, logger);

  // FIXME:PT add support for serverless once PR merges - https://github.com/elastic/kibana/pull/165415

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
};

const getOrCreateFleetServerAgentPolicyId = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<string> => {
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
      headers: {
        'elastic-api-version': '2023-10-31',
      },
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
    .then((response) => response.data.item);

  log.indent(4);
  log.info(
    `Agent Policy created: ${createdFleetServerPolicy.name} (${createdFleetServerPolicy.id})`
  );
  log.verbose(createdFleetServerPolicy);
  log.indent(-4);

  return createdFleetServerPolicy.id;
};

interface StartFleetServerWithDockerOptions {
  kbnClient: KbnClient;
  logger: ToolingLog;
  policyId: string;
  serviceToken: string;
  version?: string;
  port?: number;
}

const startFleetServerWithDocker = async ({
  kbnClient,
  logger: log,
  policyId,
  serviceToken,
  version,
  port = 8220,
}: StartFleetServerWithDockerOptions): Promise<StartedServer> => {
  const agentVersion = version || (await getAgentVersionMatchingCurrentStack(kbnClient));

  log.info(`Starting a new fleet server using Docker (version: ${agentVersion})`);

  const localhostRealIp = getLocalhostRealIp();
  const fleetServerUrl = `https://${localhostRealIp}:${port}`;
  const esURL = new URL(await getFleetElasticsearchOutputHost(kbnClient));
  const containerName = `dev-fleet-server.${port}`;
  const hostname = `dev-fleet-server.${port}.${Math.random().toString(32).substring(2, 6)}`;
  let containerId = '';

  if (isLocalhost(esURL.hostname)) {
    esURL.hostname = localhostRealIp;
  }

  try {
    const dockerArgs = [
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
      hostname,

      '--env',
      'FLEET_SERVER_ENABLE=1',

      '--env',
      `FLEET_SERVER_ELASTICSEARCH_HOST=${esURL.toString()}`,

      '--env',
      `FLEET_SERVER_SERVICE_TOKEN=${serviceToken}`,

      '--env',
      `FLEET_SERVER_POLICY=${policyId}`,

      '--publish',
      `${port}:8220`,

      `docker.elastic.co/beats/elastic-agent:${agentVersion}`,
    ];

    await execa('docker', ['kill', containerName])
      .then(() => {
        log.verbose(
          `Killed an existing container with name [${containerName}]. New one will be started.`
        );
      })
      .catch((error) => {
        log.verbose(`Attempt to kill currently running fleet-server container (if any) with name [${containerName}] was unsuccessful:
  ${error}
(This is ok if one was not running already)`);
      });

    log.verbose(`docker arguments:\n${dockerArgs.join(' ')}`);

    containerId = (await execa('docker', dockerArgs)).stdout;

    log.info(`Fleet server started. Waiting for it to show up in Kibana`);

    const [fleetServerAgent] = await Promise.all([
      waitForHostToEnroll(kbnClient, hostname, 120000),
      addFleetServerHostToFleetSettings(kbnClient, log, fleetServerUrl),
      updateFleetElasticsearchOutputHostNames(kbnClient, log),
    ]);

    log.verbose(`Fleet server enrolled agent:\n${JSON.stringify(fleetServerAgent, null, 2)}`);
  } catch (error) {
    log.error(dump(error));
    throw error;
  }

  const info = `
  Container Name: ${containerName}
  Container Id:   ${containerId}

  View running output:  ${chalk.cyan(`docker attach ---sig-proxy=false ${containerName}`)}
  Shell access:         ${chalk.cyan(`docker exec -it ${containerName} /bin/bash`)}
  Kill container:       ${chalk.cyan(`docker kill ${containerId}`)}
`;

  log.info(`Done. Fleet server up and running`);

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
};

const addFleetServerHostToFleetSettings = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  fleetServerHostUrl: string
): Promise<FleetServerHost> => {
  log.verbose(`Updating Fleet with new fleet server host: ${fleetServerHostUrl}`);
  log.indent(4);

  try {
    const exitingFleetServerHostUrl = await fetchFleetServerUrl(kbnClient);

    const newFleetHostEntry: PostFleetServerHostsRequest['body'] = {
      name: `Dev fleet server running on localhost`,
      host_urls: [fleetServerHostUrl],
      is_default: !exitingFleetServerHostUrl,
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
    log.indent(-4);

    return item;
  } catch (error) {
    log.error(dump(error));
    log.indent(-4);
    throw error;
  }
};

const updateFleetElasticsearchOutputHostNames = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<void> => {
  log.verbose('Checking if Fleet settings needs to updated');
  log.indent(4);

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

            log.verbose(`Updating Fleet Settings for Output [${output.name} (${id})]`);

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
    log.indent(-4);
    throw error;
  }

  log.indent(-4);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CA_TRUSTED_FINGERPRINT,
  FLEET_SERVER_CERT_PATH,
  FLEET_SERVER_KEY_PATH,
  fleetServerDevServiceAccount,
} from '@kbn/dev-utils';
import type {
  AgentPolicy,
  CreateAgentPolicyResponse,
  GetPackagePoliciesResponse,
  Output,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import {
  AGENT_POLICY_API_ROUTES,
  API_VERSIONS,
  APP_API_ROUTES,
  FLEET_SERVER_PACKAGE,
  PACKAGE_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import type {
  FleetServerHost,
  GenerateServiceTokenResponse,
  GetOneOutputResponse,
  GetOutputsResponse,
  PutOutputRequest,
} from '@kbn/fleet-plugin/common/types';
import {
  fleetServerHostsRoutesService,
  outputRoutesService,
} from '@kbn/fleet-plugin/common/services';
import execa from 'execa';
import type {
  PostFleetServerHostsRequest,
  PostFleetServerHostsResponse,
} from '@kbn/fleet-plugin/common/types/rest_spec/fleet_server_hosts';
import chalk from 'chalk';
import { maybeCreateDockerNetwork, SERVERLESS_NODES, verifyDockerInstalled } from '@kbn/es';
import { FLEET_SERVER_CUSTOM_CONFIG } from '../common/fleet_server/fleet_server_services';
import { isServerlessKibanaFlavor } from '../common/stack_services';
import type { FormattedAxiosError } from '../common/format_axios_error';
import { catchAxiosErrorFormatAndThrow } from '../common/format_axios_error';
import { isLocalhost } from '../common/is_localhost';
import { dump } from './utils';
import { fetchFleetServerUrl, waitForHostToEnroll } from '../common/fleet_services';
import { getRuntimeServices } from './runtime';

export const runFleetServerIfNeeded = async (): Promise<
  { fleetServerContainerId: string; fleetServerAgentPolicyId: string | undefined } | undefined
> => {
  let fleetServerContainerId;
  let fleetServerAgentPolicyId;
  let serviceToken;

  const {
    log,
    kibana: { isLocalhost: isKibanaOnLocalhost },
    kbnClient,
  } = getRuntimeServices();

  log.info(`Setting up fleet server (if necessary)`);
  log.indent(4);
  const isServerless = await isServerlessKibanaFlavor(kbnClient);

  await verifyDockerInstalled(log);
  await maybeCreateDockerNetwork(log);

  try {
    if (isServerless) {
      fleetServerContainerId = await startFleetServerStandAloneWithDocker();
    } else {
      fleetServerAgentPolicyId = await getOrCreateFleetServerAgentPolicyId();
      serviceToken = await generateFleetServiceToken();
      if (isKibanaOnLocalhost) {
        await configureFleetIfNeeded();
      }
      fleetServerContainerId = await startFleetServerWithDocker({
        policyId: fleetServerAgentPolicyId,
        serviceToken,
      });
    }
  } catch (error) {
    log.error(dump(error));
    log.indent(-4);
    throw error;
  }

  log.indent(-4);

  return { fleetServerContainerId, fleetServerAgentPolicyId };
};

const getFleetServerPackagePolicy = async (): Promise<PackagePolicy | undefined> => {
  const { kbnClient } = getRuntimeServices();

  return kbnClient
    .request<GetPackagePoliciesResponse>({
      method: 'GET',
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      query: {
        perPage: 1,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "${FLEET_SERVER_PACKAGE}"`,
      },
    })
    .then((response) => response.data.items[0]);
};

const getOrCreateFleetServerAgentPolicyId = async (): Promise<string> => {
  const { log, kbnClient } = getRuntimeServices();

  const existingFleetServerIntegrationPolicy = await getFleetServerPackagePolicy();

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
        'elastic-api-version': API_VERSIONS.public.v1,
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

const generateFleetServiceToken = async (): Promise<string> => {
  const { kbnClient, log } = getRuntimeServices();

  const serviceToken: string = await kbnClient
    .request<GenerateServiceTokenResponse>({
      method: 'POST',
      path: APP_API_ROUTES.GENERATE_SERVICE_TOKEN_PATTERN,
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      body: {},
    })
    .then((response) => response.data.value);

  log.info(`New service token created.`);

  return serviceToken;
};

export const startFleetServerWithDocker = async ({
  policyId,
  serviceToken,
}: {
  policyId: string;
  serviceToken: string;
}) => {
  let containerId;
  const {
    log,
    localhostRealIp,
    elastic: { url: elasticUrl, isLocalhost: isElasticOnLocalhost },
    fleetServer: { port: fleetServerPort },
    kbnClient,
    options: { version },
  } = getRuntimeServices();

  log.info(`Starting a new fleet server using Docker`);
  log.indent(4);

  const esURL = new URL(elasticUrl);
  const containerName = `dev-fleet-server.${fleetServerPort}`;
  let esUrlWithRealIp: string = elasticUrl;

  if (isElasticOnLocalhost) {
    esURL.hostname = localhostRealIp;
    esUrlWithRealIp = esURL.toString();
  }

  try {
    const dockerArgs = [
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
      // The container's hostname will appear in Fleet when the agent enrolls
      '--hostname',
      containerName,
      '--env',
      'FLEET_SERVER_ENABLE=1',
      '--env',
      `FLEET_SERVER_ELASTICSEARCH_HOST=${esUrlWithRealIp}`,
      '--env',
      `FLEET_SERVER_SERVICE_TOKEN=${serviceToken}`,
      '--env',
      `FLEET_SERVER_POLICY=${policyId}`,
      '--publish',
      `${fleetServerPort}:8220`,
      `docker.elastic.co/beats/elastic-agent:${version}`,
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

    await addFleetServerHostToFleetSettings(`https://${localhostRealIp}:${fleetServerPort}`);

    log.verbose(`docker arguments:\n${dockerArgs.join(' ')}`);

    containerId = (await execa('docker', dockerArgs)).stdout;

    const fleetServerAgent = await waitForHostToEnroll(kbnClient, containerName, 120000);

    log.verbose(`Fleet server enrolled agent:\n${JSON.stringify(fleetServerAgent, null, 2)}`);

    log.info(`Done. Fleet Server is running and connected to Fleet.
  Container Name: ${containerName}
  Container Id:   ${containerId}

  View running output:  ${chalk.bold(`docker attach ---sig-proxy=false ${containerName}`)}
  Shell access:         ${chalk.bold(`docker exec -it ${containerName} /bin/bash`)}
  Kill container:       ${chalk.bold(`docker kill ${containerId}`)}
`);
  } catch (error) {
    log.error(dump(error));
    log.indent(-4);
    throw error;
  }

  log.indent(-4);

  return containerId;
};

export const startFleetServerStandAloneWithDocker = async () => {
  let containerId;
  const {
    log,
    elastic: { url: elasticUrl },
    fleetServer: { port: fleetServerPort },
  } = getRuntimeServices();

  log.info(`Starting a new fleet server using Docker`);
  log.indent(4);
  const esURL = new URL(elasticUrl);

  esURL.hostname = SERVERLESS_NODES[0].name;

  const esUrlWithRealIp = esURL.toString();

  const containerName = `dev-fleet-server.${fleetServerPort}`;
  try {
    const dockerArgs = [
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
      // The container's hostname will appear in Fleet when the agent enrolls
      '--hostname',
      containerName,
      '--volume',
      `${FLEET_SERVER_CERT_PATH}:/fleet-server.crt`,
      '--volume',
      `${FLEET_SERVER_KEY_PATH}:/fleet-server.key`,
      '--env',
      'FLEET_SERVER_CERT=/fleet-server.crt',
      '--env',
      'FLEET_SERVER_CERT_KEY=/fleet-server.key',
      '--env',
      `ELASTICSEARCH_HOSTS=${esUrlWithRealIp}`,
      '--env',
      `ELASTICSEARCH_SERVICE_TOKEN=${fleetServerDevServiceAccount.token}`,
      '--env',
      `ELASTICSEARCH_CA_TRUSTED_FINGERPRINT=${CA_TRUSTED_FINGERPRINT}`,
      '--volume',
      `${FLEET_SERVER_CUSTOM_CONFIG}:/etc/fleet-server.yml:ro`,
      '--publish',
      `${fleetServerPort}:8220`,
      `docker.elastic.co/observability-ci/fleet-server:latest`,
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

    log.info(`Done. Fleet Server Stand Alone is running and connected to Fleet.
  Container Name: ${containerName}
  Container Id:   ${containerId}

  View running output:  ${chalk.bold(`docker attach ---sig-proxy=false ${containerName}`)}
  Shell access:         ${chalk.bold(`docker exec -it ${containerName} /bin/bash`)}
  Kill container:       ${chalk.bold(`docker kill ${containerId}`)}
`);
  } catch (error) {
    log.error(dump(error));
    log.indent(-4);
    throw error;
  }

  log.indent(-4);

  return containerId;
};

const configureFleetIfNeeded = async () => {
  const { log, kbnClient, localhostRealIp } = getRuntimeServices();

  log.info('Checking if Fleet needs to be configured');
  log.indent(4);

  try {
    // make sure that all ES hostnames are using localhost real IP
    const fleetOutputs = await kbnClient
      .request<GetOutputsResponse>({
        method: 'GET',
        headers: {
          'elastic-api-version': API_VERSIONS.public.v1,
        },
        path: outputRoutesService.getListPath(),
      })
      .then((response) => response.data);

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
                headers: {
                  'elastic-api-version': API_VERSIONS.public.v1,
                },
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

const addFleetServerHostToFleetSettings = async (
  fleetServerHostUrl: string
): Promise<FleetServerHost> => {
  const { kbnClient, log } = getRuntimeServices();

  log.info(`Updating Fleet with new fleet server host: ${fleetServerHostUrl}`);
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
          log.error(`Update failed with [403: ${error.response.data.message}].

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentPolicy,
  CreateAgentPolicyResponse,
  PackagePolicy,
  GetPackagePoliciesResponse,
  Output,
} from '@kbn/fleet-plugin/common';
import {
  AGENT_POLICY_API_ROUTES,
  FLEET_SERVER_PACKAGE,
  PACKAGE_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import { APP_API_ROUTES } from '@kbn/fleet-plugin/common/constants';
import type {
  GetOutputsResponse,
  PutOutputRequest,
  GetOneOutputResponse,
  GenerateServiceTokenResponse,
} from '@kbn/fleet-plugin/common/types';
import { outputRoutesService } from '@kbn/fleet-plugin/common/services';
import execa from 'execa';
import { isLocalhost } from '../common/localhost_services';
import { fetchFleetAgents, waitForHostToEnroll } from '../common/fleet_services';
import { getRuntimeServices } from './runtime';

export const runFleetServerIfNeeded = async () => {
  const {
    log,
    kibana: { isLocalhost: isKibanaOnLocalhost },
  } = getRuntimeServices();

  log.info(`Setting up fleet server (if necessary)`);
  log.indent(4);

  const fleetServerAlreadyEnrolled = await isFleetServerEnrolled();

  if (fleetServerAlreadyEnrolled) {
    log.info(`Fleet server is already enrolled with Fleet. Nothing to do.`);
    log.indent(-4);
    return;
  }

  try {
    const fleetServerAgentPolicyId = await getOrCreateFleetServerAgentPolicyId();
    const serviceToken = await generateFleetServiceToken();

    if (isKibanaOnLocalhost) {
      await configureFleetIfNeeded();
    }

    await startFleetServerWithDocker({
      policyId: fleetServerAgentPolicyId,
      serviceToken,
    });
  } catch (e) {
    log.indent(-4);
    throw e;
  }

  log.indent(-4);
};

const isFleetServerEnrolled = async () => {
  const { kbnClient } = getRuntimeServices();
  const policyId = (await getFleetServerPackagePolicy())?.policy_id;

  if (!policyId) {
    return false;
  }

  const fleetAgentsResponse = await fetchFleetAgents(kbnClient, {
    kuery: `(policy_id: "${policyId}" and active : true) and (status:online)`,
    showInactive: false,
    perPage: 1,
  });

  return Boolean(fleetAgentsResponse.total);
};

const getFleetServerPackagePolicy = async (): Promise<PackagePolicy | undefined> => {
  const { kbnClient } = getRuntimeServices();

  return kbnClient
    .request<GetPackagePoliciesResponse>({
      method: 'GET',
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
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
      body: {},
    })
    .then((response) => response.data.value);

  log.info(`New service token created.`);

  return serviceToken;
};

const startFleetServerWithDocker = async ({
  policyId,
  serviceToken,
}: {
  policyId: string;
  serviceToken: string;
}) => {
  const {
    log,
    localhostRealIp,
    elastic: { url: elasticUrl, isLocalhost: isElasticOnLocalhost },
    kbnClient,
  } = getRuntimeServices();

  log.info(`Starting a new fleet server using Docker`);
  log.indent(4);

  const esURL = new URL(elasticUrl);
  const containerName = `dev-fleet-server.${esURL.hostname}`;
  let esUrlWithRealIp: string = elasticUrl;

  if (isElasticOnLocalhost) {
    esURL.hostname = localhostRealIp;
    esUrlWithRealIp = esURL.toString();
  }

  try {
    const agentVersion = await getAgentVersionMatchingCurrentStack();

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
      '8220:8220',

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

    const containerId = (await execa('docker', dockerArgs)).stdout;

    await waitForHostToEnroll(kbnClient, containerName);

    log.info(`Done. Fleet Server is running and connected to Fleet.
  Container Name: ${containerName}
  Container Id:   ${containerId}

  View running output:  docker attach ---sig-proxy=false ${containerName}
  Shell access:         docker exec -it ${containerName} /bin/bash
`);
  } catch (error) {
    log.indent(-4);
    throw error;
  }

  log.indent(-4);
};

const getAgentVersionMatchingCurrentStack = async (): Promise<string> => {
  const { kbnClient } = getRuntimeServices();

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

const configureFleetIfNeeded = async () => {
  const { log, kbnClient, localhostRealIp } = getRuntimeServices();

  log.info('Checking if Fleet needs to be configured');
  log.indent(4);

  try {
    // make sure that all ES hostnames are using localhost real IP
    const fleetOutputs = await kbnClient
      .request<GetOutputsResponse>({
        method: 'GET',
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

            await kbnClient.request<GetOneOutputResponse>({
              method: 'PUT',
              path: outputRoutesService.getUpdatePath(id),
              body: update,
            });
          }
        }
      }
    }

    // TODO:PT should we also add an entry to the Fleet server list in settings?
  } catch (error) {
    log.indent(-4);
    throw error;
  }

  log.indent(-4);
};

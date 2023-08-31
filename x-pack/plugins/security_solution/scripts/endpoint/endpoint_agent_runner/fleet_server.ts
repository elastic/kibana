/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CA_CERT_PATH,
  ES_CERT_PATH,
  KBN_CERT_PATH,
  FLEET_SERVER_CERT_PATH,
  FLEET_SERVER_KEY_PATH,
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
  FLEET_SERVER_PACKAGE,
  PACKAGE_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import { APP_API_ROUTES } from '@kbn/fleet-plugin/common/constants';
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
import type { FormattedAxiosError } from '../common/format_axios_error';
import { catchAxiosErrorFormatAndThrow } from '../common/format_axios_error';
import { isLocalhost } from '../common/is_localhost';
import { dump } from './utils';
import { fetchFleetServerUrl, waitForHostToEnroll } from '../common/fleet_services';
import { getRuntimeServices } from './runtime';

export const runFleetServerIfNeeded = async (): Promise<
  { fleetServerContainerId: string; fleetServerAgentPolicyId: string } | undefined
> => {
  let fleetServerContainerId;
  let fleetServerAgentPolicyId;

  const {
    log,
    kibana: { isLocalhost: isKibanaOnLocalhost },
  } = getRuntimeServices();

  log.info(`Setting up fleet server (if necessary)`);
  log.indent(4);

  try {
    fleetServerAgentPolicyId = await getOrCreateFleetServerAgentPolicyId();
    const serviceToken =
      'AAEAAWVsYXN0aWMvZmxlZXQtc2VydmVyL2ZsZWV0LXNlcnZlci1kZXY6cWtqR1hSS2FRSzIyb01McFg3aTQwdw'; // await generateFleetServiceToken();

    if (isKibanaOnLocalhost) {
      await configureFleetIfNeeded();
    }

    fleetServerContainerId = await startFleetServerWithDocker({
      policyId: fleetServerAgentPolicyId,
      serviceToken,
    });
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
    // const dockerArgs = [
    //   'run',

    //   '--restart',
    //   'no',

    //   '--add-host',
    //   'host.docker.internal:host-gateway',

    //   '--rm',

    //   '--detach',

    //   '--name',
    //   containerName,

    //   // The container's hostname will appear in Fleet when the agent enrolls
    //   '--hostname',
    //   containerName,

    //   '--volume',
    //   `${CA_CERT_PATH}:/ca.crt`,

    //   '--env',
    //   'FLEET_SERVER_ENABLE=1',

    //   '--env',
    //   `FLEET_SERVER_ELASTICSEARCH_HOST=${esUrlWithRealIp}`,

    //   '--env',
    //   `FLEET_SERVER_SERVICE_TOKEN=${serviceToken}`,

    //   '--env',
    //   'ELASTICSEARCH_HOSTS=https://host.docker.internal:9200',

    //   '--env',
    //   `FLEET_SERVER_ELASTICSEARCH_CA=/ca.crt`,

    //   '--env',
    //   'ELASTICSEARCH_SERVICE_TOKEN=AAEAAWVsYXN0aWMva2liYW5hL2tpYmFuYS1kZXY6VVVVVVVVTEstKiBaNA',

    //   '--env',
    //   'ELASTICSEARCH_CA_TRUSTED_FINGERPRINT=F71F73085975FD977339A1909EBFE2DF40DB255E0D5BB56FC37246BF383FFC84',

    //   '--env',
    //   `FLEET_SERVER_POLICY=${policyId}`,

    //   '--publish',
    //   `${fleetServerPort}:8220`,

    //   `docker.elastic.co/observability-ci/fleet-server:latest`,
    // ];
    const dockerArgs = [
      'run',

      '--restart',
      'no',

      '--add-host',
      'host.docker.internal:host-gateway',

      //   '--network',
      // 'elastic',

      // '--rm',

      '--detach',

      // '--name',
      // containerName,

      // The container's hostname will appear in Fleet when the agent enrolls
      '--hostname',
      containerName,

      '--volume',
      `${CA_CERT_PATH}:/ca.crt`,

      '--volume',
      `${KBN_CERT_PATH}:/kibana.crt`,

      '--volume',
      `${ES_CERT_PATH}:/elasticsearch.crt`,

      '--volume',
      `${FLEET_SERVER_CERT_PATH}:/fleet-server.crt`,

      '--volume',
      `${FLEET_SERVER_KEY_PATH}:/fleet-server.key`,

      // `--env`,
      // `KIBANA_FLEET_CA=/elasticsearch.crt`,

      // `--env`,
      // `KIBANA_CA=/elasticsearch.crt`,

      // `--env`,
      // `FLEET_CA=/kibana.crt`,

      '--env',
      'FLEET_SERVER_ENABLE=1',

      '--env',
      // `FLEET_SERVER_ELASTICSEARCH_HOST=${esUrlWithRealIp}`,
      `FLEET_SERVER_ELASTICSEARCH_HOST=https://host.docker.internal:9200`,

      '--env',
      'FLEET_URL=https://localhost:8220',

      '--env',
      `FLEET_SERVER_SERVICE_TOKEN=${serviceToken}`,

      '--env',
      'FLEET_SERVER_ELASTICSEARCH_INSECURE=1',

      // '--env',
      // 'FLEET_SERVER_INSECURE_HTTP=1',

      '--env',
      'FLEET_INSECURE=1',

      '--env',
      'ES_HOST=https://host.docker.internal:9200',

      '--env',
      'KIBANA_FLEET_SETUP=true',

      '--env',
      'ELASTICSEARCH_HOST=https://host.docker.internal:9200',

      '--env',
      'FLEET_SERVER_ELASTICSEARCH_HOSTS=https://host.docker.internal:9200',

      // '--env',
      // `ELASTICSEARCH_CA=/elasticsearch.crt`,

      // '--env',
      // 'FLEET_SERVER_ELASTICSEARCH_SERVICE_TOKEN=AAEAAWVsYXN0aWMva2liYW5hL2tpYmFuYS1kZXY6VVVVVVVVTEstKiBaNA',

      // '--env',
      // 'FLEET_SERVER_CERT=/fleet-server.crt',

      // '--env',
      // 'FLEET_SERVER_CERT_KEY=/fleet-server.key',

      // '--env',
      // 'FLEET_SERVER_ELASTICSEARCH_CA=/elasticsearch.crt',
      // '--env',
      // 'FLEET_SERVER_ELASTICSEARCH_CA_TRUSTED_FINGERPRINT=F71F73085975FD977339A1909EBFE2DF40DB255E0D5BB56FC37246BF383FFC84',

      '--env',
      `FLEET_SERVER_POLICY=${policyId}`,

      '--publish',
      `${fleetServerPort}:8220`,

      `docker.elastic.co/beats/elastic-agent:8.10.0-SNAPSHOT`,
    ];

    console.error(`docker arguments:\n${dockerArgs.join(' ')}`);

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

    // await addFleetServerHostToFleetSettings(`https://${localhostRealIp}:${fleetServerPort}`);

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

            await kbnClient
              .request<GetOneOutputResponse>({
                method: 'PUT',
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

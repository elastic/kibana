/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';
import seedrandom from 'seedrandom';
import { KbnClient } from '@kbn/dev-utils';
import { AxiosResponse } from 'axios';
import fetch from 'node-fetch';
import { EndpointDocGenerator, TreeOptions, Event } from './generate_data';
import { firstNonNullValue } from './models/ecs_safety_helpers';
import {
  CreateAgentConfigRequest,
  CreateAgentConfigResponse,
  CreatePackageConfigRequest,
  CreatePackageConfigResponse,
  GetPackagesResponse,
  PostAgentEnrollRequest,
  AGENT_API_ROUTES,
  AGENT_CONFIG_API_ROUTES,
  EPM_API_ROUTES,
  PACKAGE_CONFIG_API_ROUTES,
  ENROLLMENT_API_KEY_ROUTES,
  GetEnrollmentAPIKeysResponse,
  GetOnePackageConfigResponse,
  GetOneEnrollmentAPIKeyResponse,
  PostAgentEnrollResponse,
} from '../../../ingest_manager/common';
import { factory as policyConfigFactory } from './models/policy_config';
import { HostMetadata } from './types';

export async function indexHostsAndAlerts(
  client: Client,
  kbnClient: KbnClient,
  seed: string,
  numHosts: number,
  numDocs: number,
  metadataIndex: string,
  policyResponseIndex: string,
  eventIndex: string,
  alertIndex: string,
  alertsPerHost: number,
  options: TreeOptions = {}
) {
  const random = seedrandom(seed);
  const epmEndpointPackage = await getEndpointPackageInfo(kbnClient);
  // Keep a map of host applied policy ids (fake) to real ingest package configs (policy record)
  const realPolicies: Record<string, CreatePackageConfigResponse['item']> = {};

  for (let i = 0; i < numHosts; i++) {
    const generator = new EndpointDocGenerator(random);
    await indexHostDocs(
      numDocs,
      client,
      kbnClient,
      realPolicies,
      epmEndpointPackage,
      metadataIndex,
      policyResponseIndex,
      generator
    );
    await indexAlerts(client, eventIndex, alertIndex, generator, alertsPerHost, options);
  }
  await client.indices.refresh({
    index: eventIndex,
  });
  // TODO: Unclear why the documents are not showing up after the call to refresh.
  // Waiting 5 seconds allows the indices to refresh automatically and
  // the documents become available in API/integration tests.
  await delay(5000);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function indexHostDocs(
  numDocs: number,
  client: Client,
  kbnClient: KbnClient,
  realPolicies: Record<string, CreatePackageConfigResponse['item']>,
  epmEndpointPackage: GetPackagesResponse['response'][0],
  metadataIndex: string,
  policyResponseIndex: string,
  generator: EndpointDocGenerator
) {
  const timeBetweenDocs = 6 * 3600 * 1000; // 6 hours between metadata documents
  const timestamp = new Date().getTime();
  let hostMetadata: HostMetadata;

  for (let j = 0; j < numDocs; j++) {
    generator.updateHostData();
    generator.updateHostPolicyData();

    hostMetadata = generator.generateHostMetadata(timestamp - timeBetweenDocs * (numDocs - j - 1));
    const { id: appliedPolicyId, name: appliedPolicyName } = hostMetadata.Endpoint.policy.applied;

    if (appliedPolicyId !== '00000000-0000-0000-0000-000000000000') {
      // If we don't yet have a "real" policy record, then create it now in ingest (package config)
      if (!realPolicies[appliedPolicyId]) {
        // eslint-disable-next-line require-atomic-updates
        realPolicies[appliedPolicyId] = await createPolicy(
          kbnClient,
          appliedPolicyName,
          epmEndpointPackage.version
        );
      }

      // Update the Host metadata record with the ID of the "real" policy
      hostMetadata = {
        ...hostMetadata,
        Endpoint: {
          ...hostMetadata.Endpoint,
          policy: {
            ...hostMetadata.Endpoint.policy,
            applied: {
              ...hostMetadata.Endpoint.policy.applied,
              id: realPolicies[appliedPolicyId].id,
            },
          },
        },
      };
    }

    await client.index({
      index: metadataIndex,
      body: hostMetadata,
      op_type: 'create',
    });
    await client.index({
      index: policyResponseIndex,
      body: generator.generatePolicyResponse(timestamp - timeBetweenDocs * (numDocs - j - 1)),
      op_type: 'create',
    });
  }

  if (hostMetadata!.Endpoint.policy.applied.id !== '00000000-0000-0000-0000-000000000000') {
    await fleetEnrollAgentForHost(kbnClient, hostMetadata!);
  }
}

async function indexAlerts(
  client: Client,
  eventIndex: string,
  alertIndex: string,
  generator: EndpointDocGenerator,
  numAlerts: number,
  options: TreeOptions = {}
) {
  const alertGenerator = generator.alertsGenerator(numAlerts, options);
  let result = alertGenerator.next();
  while (!result.done) {
    let k = 0;
    const resolverDocs: Event[] = [];
    while (k < 1000 && !result.done) {
      resolverDocs.push(result.value);
      result = alertGenerator.next();
      k++;
    }
    const body = resolverDocs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (array: Array<Record<string, any>>, doc) => {
        let index = eventIndex;
        if (firstNonNullValue(doc.event?.kind) === 'alert') {
          index = alertIndex;
        }
        array.push({ create: { _index: index } }, doc);
        return array;
      },
      []
    );
    await client.bulk({ body, refresh: true });
  }
}

const createPolicy = async (
  kbnClient: KbnClient,
  policyName: string,
  endpointPackageVersion: string
): Promise<CreatePackageConfigResponse['item']> => {
  // Create Agent Configuration first
  const newAgentconfigData: CreateAgentConfigRequest['body'] = {
    name: `Config for ${policyName}`,
    description: '',
    namespace: 'default',
  };
  const agentConfig = (await kbnClient.request({
    path: AGENT_CONFIG_API_ROUTES.CREATE_PATTERN,
    method: 'POST',
    body: newAgentconfigData,
  })) as AxiosResponse<CreateAgentConfigResponse>;

  // Create Package Configuration
  const newPackageConfigData: CreatePackageConfigRequest['body'] = {
    name: policyName,
    description: 'Protect the worlds data',
    config_id: agentConfig.data.item.id,
    enabled: true,
    output_id: '',
    inputs: [
      {
        type: 'endpoint',
        enabled: true,
        streams: [],
        config: {
          policy: {
            value: policyConfigFactory(),
          },
        },
      },
    ],
    namespace: 'default',
    package: {
      name: 'endpoint',
      title: 'endpoint',
      version: endpointPackageVersion,
    },
  };
  const packageConfig = (await kbnClient.request({
    path: PACKAGE_CONFIG_API_ROUTES.CREATE_PATTERN,
    method: 'POST',
    body: newPackageConfigData,
  })) as AxiosResponse<CreatePackageConfigResponse>;
  return packageConfig.data.item;
};

const getEndpointPackageInfo = async (
  kbnClient: KbnClient
): Promise<GetPackagesResponse['response'][0]> => {
  const endpointPackage = ((await kbnClient.request({
    path: `${EPM_API_ROUTES.LIST_PATTERN}?category=security`,
    method: 'GET',
  })) as AxiosResponse<GetPackagesResponse>).data.response.find(
    (epmPackage) => epmPackage.name === 'endpoint'
  );

  if (!endpointPackage) {
    throw new Error('EPM Endpoint package was not found!');
  }

  return endpointPackage;
};

const fleetEnrollAgentForHost = async (kbnClient: KbnClient, host: HostMetadata) => {
  // Get Enrollement key for host's applied policy
  const enrollmentApiKey = await kbnClient
    .request<GetOnePackageConfigResponse>({
      path: PACKAGE_CONFIG_API_ROUTES.INFO_PATTERN.replace(
        '{packageConfigId}',
        host.Endpoint.policy.applied.id
      ),
      method: 'GET',
    })
    .then((packageConfigResponse) => {
      return kbnClient.request<GetEnrollmentAPIKeysResponse>({
        path: ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
        method: 'GET',
        query: {
          kuery: `fleet-enrollment-api-keys.config_id:"${packageConfigResponse.data.item.config_id}"`,
        },
      });
    })
    .then((apiKeysResponse) => {
      const apiKey = apiKeysResponse.data.list[0];

      // TODO: Handle if it does not exist

      return kbnClient.request<GetOneEnrollmentAPIKeyResponse>({
        path: ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN.replace('{keyId}', apiKey.id),
        method: 'GET',
      });
    })
    .then((apiKeyDetailsResponse) => {
      return apiKeyDetailsResponse.data.item.api_key;
    })
    .catch(() => {
      return '';
    });

  if (enrollmentApiKey.length === 0) {
    return;
  }

  // Enroll an agent for the Host
  const body: PostAgentEnrollRequest['body'] = {
    type: 'PERMANENT',
    shared_id: host.elastic.agent.id,
    metadata: {
      local: {
        host: host.host,
        elastic: {
          agent: {
            ...host.agent,
            version: '8.0.0',
          },
        },
      },
      user_provided: {
        dev_agent_version: '0.0.1',
        region: 'us-east',
      },
    },
  };

  try {
    // FIXME: should we use `fetch()` in this module?
    // FIXME: need way to get kibana URL without auth in it
    const res = await fetch(`http://localhost:5601${AGENT_API_ROUTES.ENROLL_PATTERN}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'kbn-xsrf': 'xxx',
        Authorization: `ApiKey ${enrollmentApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (res) {
      const obj: PostAgentEnrollResponse = await res.json();
      if (!obj.success) {
        // eslint-disable-next-line no-console
        console.error(obj);
      }
    }

    // THIS DOES NOT WORK because its sent with basic auth (Authorization header is stripped out)
    //
    // await kbnClient.request<PostAgentEnrollResponse>({
    //   path: AGENT_API_ROUTES.ENROLL_PATTERN,
    //   method: 'POST',
    //   body,
    //   headers: {
    //     Authorization: `ApiKey ${enrollmentApiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    // });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

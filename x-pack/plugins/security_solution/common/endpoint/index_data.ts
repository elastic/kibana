/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';
import seedrandom from 'seedrandom';
import { KbnClient } from '@kbn/dev-utils';
import { AxiosResponse } from 'axios';
import { EndpointDocGenerator, TreeOptions, Event } from './generate_data';
import { firstNonNullValue } from './models/ecs_safety_helpers';
import {
  CreateAgentConfigRequest,
  CreateAgentConfigResponse,
  CreatePackageConfigRequest,
  CreatePackageConfigResponse,
  GetPackagesResponse,
} from '../../../ingest_manager/common/types/rest_spec';
import {
  AGENT_CONFIG_API_ROUTES,
  EPM_API_ROUTES,
  PACKAGE_CONFIG_API_ROUTES,
} from '../../../ingest_manager/common';
import { factory as policyConfigFactory } from './models/policy_config';

export async function indexHostsAndAlerts(
  client: Client,
  kbnClient: KbnClient,
  seed: string,
  numHosts: number,
  numDocs: number,
  metadataIndex: string,
  policyIndex: string,
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
      policyIndex,
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
  policyIndex: string,
  generator: EndpointDocGenerator
) {
  const timeBetweenDocs = 6 * 3600 * 1000; // 6 hours between metadata documents
  const timestamp = new Date().getTime();

  for (let j = 0; j < numDocs; j++) {
    generator.updateHostData();
    generator.updateHostPolicyData();

    let hostMetadata = generator.generateHostMetadata(
      timestamp - timeBetweenDocs * (numDocs - j - 1)
    );
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
      index: policyIndex,
      body: generator.generatePolicyResponse(timestamp - timeBetweenDocs * (numDocs - j - 1)),
      op_type: 'create',
    });
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

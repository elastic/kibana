/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, estypes } from '@elastic/elasticsearch';
import seedrandom from 'seedrandom';
// eslint-disable-next-line import/no-extraneous-dependencies
import { KbnClient } from '@kbn/test';
import { AxiosResponse } from 'axios';
import { EndpointDocGenerator, Event, TreeOptions } from './generate_data';
import { firstNonNullValue } from './models/ecs_safety_helpers';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  AGENT_POLICY_API_ROUTES,
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  EPM_API_ROUTES,
  FLEET_SERVER_SERVERS_INDEX,
  FleetServerAgent,
  GetPackagesResponse,
  PACKAGE_POLICY_API_ROUTES,
} from '../../../fleet/common';
import { policyFactory as policyConfigFactory } from './models/policy_config';
import { EndpointAction, HostMetadata } from './types';
import { KbnClientWithApiKeySupport } from '../../scripts/endpoint/kbn_client_with_api_key_support';
import { FleetAgentGenerator } from './data_generators/fleet_agent_generator';
import { FleetActionGenerator } from './data_generators/fleet_action_generator';

const fleetAgentGenerator = new FleetAgentGenerator();
const fleetActionGenerator = new FleetActionGenerator();

export async function indexHostsAndAlerts(
  client: Client,
  kbnClient: KbnClientWithApiKeySupport,
  seed: string,
  numHosts: number,
  numDocs: number,
  metadataIndex: string,
  policyResponseIndex: string,
  eventIndex: string,
  alertIndex: string,
  alertsPerHost: number,
  fleet: boolean,
  options: TreeOptions = {}
) {
  const random = seedrandom(seed);
  const epmEndpointPackage = await getEndpointPackageInfo(kbnClient);

  // If `fleet` integration is true, then ensure a (fake) fleet-server is connected
  if (fleet) {
    await enableFleetServerIfNecessary(client);
  }

  // Keep a map of host applied policy ids (fake) to real ingest package configs (policy record)
  const realPolicies: Record<string, CreatePackagePolicyResponse['item']> = {};

  for (let i = 0; i < numHosts; i++) {
    const generator = new EndpointDocGenerator(random);
    await indexHostDocs({
      numDocs,
      client,
      kbnClient,
      realPolicies,
      epmEndpointPackage,
      metadataIndex,
      policyResponseIndex,
      enrollFleet: fleet,
      generator,
    });
    await indexAlerts({
      client,
      eventIndex,
      alertIndex,
      generator,
      numAlerts: alertsPerHost,
      options,
    });
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

async function indexHostDocs({
  numDocs,
  client,
  kbnClient,
  realPolicies,
  epmEndpointPackage,
  metadataIndex,
  policyResponseIndex,
  enrollFleet,
  generator,
}: {
  numDocs: number;
  client: Client;
  kbnClient: KbnClientWithApiKeySupport;
  realPolicies: Record<string, CreatePackagePolicyResponse['item']>;
  epmEndpointPackage: GetPackagesResponse['response'][0];
  metadataIndex: string;
  policyResponseIndex: string;
  enrollFleet: boolean;
  generator: EndpointDocGenerator;
}) {
  const timeBetweenDocs = 6 * 3600 * 1000; // 6 hours between metadata documents
  const timestamp = new Date().getTime();
  const kibanaVersion = await fetchKibanaVersion(kbnClient);
  let hostMetadata: HostMetadata;
  let wasAgentEnrolled = false;
  let enrolledAgent: undefined | estypes.SearchHit<FleetServerAgent>;

  for (let j = 0; j < numDocs; j++) {
    generator.updateHostData();
    generator.updateHostPolicyData();

    hostMetadata = generator.generateHostMetadata(
      timestamp - timeBetweenDocs * (numDocs - j - 1),
      EndpointDocGenerator.createDataStreamFromIndex(metadataIndex)
    );

    if (enrollFleet) {
      const { id: appliedPolicyId, name: appliedPolicyName } = hostMetadata.Endpoint.policy.applied;

      // If we don't yet have a "real" policy record, then create it now in ingest (package config)
      if (!realPolicies[appliedPolicyId]) {
        // eslint-disable-next-line require-atomic-updates
        realPolicies[appliedPolicyId] = await createPolicy(
          kbnClient,
          appliedPolicyName,
          epmEndpointPackage.version
        );
      }

      // If we did not yet enroll an agent for this Host, do it now that we have good policy id
      if (!wasAgentEnrolled) {
        wasAgentEnrolled = true;

        enrolledAgent = await indexFleetAgentForHost(
          client,
          hostMetadata!,
          realPolicies[appliedPolicyId].policy_id,
          kibanaVersion
        );
      }
      // Update the Host metadata record with the ID of the "real" policy along with the enrolled agent id
      hostMetadata = {
        ...hostMetadata,
        elastic: {
          ...hostMetadata.elastic,
          agent: {
            ...hostMetadata.elastic.agent,
            id: enrolledAgent?._id ?? hostMetadata.elastic.agent.id,
          },
        },
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

      // Create some actions for this Host
      await indexFleetActionsForHost(client, hostMetadata);
    }

    await client.index({
      index: metadataIndex,
      body: hostMetadata,
      op_type: 'create',
    });
    await client.index({
      index: policyResponseIndex,
      body: generator.generatePolicyResponse({
        ts: timestamp - timeBetweenDocs * (numDocs - j - 1),
        policyDataStream: EndpointDocGenerator.createDataStreamFromIndex(policyResponseIndex),
      }),
      op_type: 'create',
    });
  }
}

async function indexAlerts({
  client,
  eventIndex,
  alertIndex,
  generator,
  numAlerts,
  options = {},
}: {
  client: Client;
  eventIndex: string;
  alertIndex: string;
  generator: EndpointDocGenerator;
  numAlerts: number;
  options: TreeOptions;
}) {
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
): Promise<CreatePackagePolicyResponse['item']> => {
  // Create Agent Policy first
  const newAgentPolicyData: CreateAgentPolicyRequest['body'] = {
    name: `Policy for ${policyName} (${Math.random().toString(36).substr(2, 5)})`,
    description: `Policy created with endpoint data generator (${policyName})`,
    namespace: 'default',
  };
  let agentPolicy;
  try {
    agentPolicy = (await kbnClient.request({
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      method: 'POST',
      body: newAgentPolicyData,
    })) as AxiosResponse<CreateAgentPolicyResponse>;
  } catch (error) {
    throw new Error(`create policy ${error}`);
  }

  // Create Package Configuration
  const newPackagePolicyData: CreatePackagePolicyRequest['body'] = {
    name: policyName,
    description: 'Protect the worlds data',
    policy_id: agentPolicy.data.item.id,
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
  const packagePolicy = (await kbnClient.request({
    path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
    method: 'POST',
    body: newPackagePolicyData,
  })) as AxiosResponse<CreatePackagePolicyResponse>;
  return packagePolicy.data.item;
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

const fetchKibanaVersion = async (kbnClient: KbnClientWithApiKeySupport) => {
  const version = ((await kbnClient.request({
    path: '/api/status',
    method: 'GET',
  })) as AxiosResponse).data.version.number;

  if (!version) {
    // eslint-disable-next-line no-console
    console.log('failed to retrieve kibana version');
    return '8.0.0';
  }

  return version;
};

/**
 * Will ensure that at least one fleet server is present in the `.fleet-servers` index. This will
 * enable the `Agent` section of kibana Fleet to be displayed
 *
 * @param esClient
 * @param version
 */
const enableFleetServerIfNecessary = async (esClient: Client, version: string = '8.0.0') => {
  const res = await esClient.search<{}, {}>({
    index: FLEET_SERVER_SERVERS_INDEX,
    ignore_unavailable: true,
  });

  // @ts-expect-error value is number | TotalHits
  if (res.body.hits.total.value > 0) {
    return;
  }

  // Create a Fake fleet-server in this kibana instance
  await esClient.index({
    index: FLEET_SERVER_SERVERS_INDEX,
    body: {
      agent: {
        id: '12988155-475c-430d-ac89-84dc84b67cd1',
        version: '',
      },
      host: {
        architecture: 'linux',
        id: 'c3e5f4f690b4a3ff23e54900701a9513',
        ip: ['127.0.0.1', '::1', '10.201.0.213', 'fe80::4001:aff:fec9:d5'],
        name: 'endpoint-data-generator',
      },
      server: {
        id: '12988155-475c-430d-ac89-84dc84b67cd1',
        version: '8.0.0-SNAPSHOT',
      },
      '@timestamp': '2021-05-12T18:42:52.009482058Z',
    },
  });
};

const indexFleetAgentForHost = async (
  esClient: Client,
  endpointHost: HostMetadata,
  agentPolicyId: string,
  kibanaVersion: string = '8.0.0'
): Promise<estypes.SearchHit<FleetServerAgent>> => {
  const agentDoc = fleetAgentGenerator.generateEsHit({
    _source: {
      local_metadata: {
        elastic: {
          agent: {
            version: kibanaVersion,
          },
        },
        host: {
          ...endpointHost.host,
        },
        os: {
          ...endpointHost.host.os,
        },
      },
      policy_id: agentPolicyId,
    },
  });

  await esClient.index<FleetServerAgent>({
    index: agentDoc._index,
    id: agentDoc._id,
    body: agentDoc._source!,
    op_type: 'create',
  });

  return agentDoc;
};

const indexFleetActionsForHost = async (
  esClient: Client,
  endpointHost: HostMetadata
): Promise<void> => {
  const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };
  const agentId = endpointHost.elastic.agent.id;
  const total = fleetActionGenerator.randomN(5);

  for (let i = 0; i < total; i++) {
    // create an action
    const action = fleetActionGenerator.generate({
      data: { comment: 'data generator: this host is bad' },
    });

    action.agents = [agentId];

    await esClient.index(
      {
        index: AGENT_ACTIONS_INDEX,
        body: action,
      },
      ES_INDEX_OPTIONS
    );

    // Create an action response for the above
    const actionResponse = fleetActionGenerator.generateResponse({
      action_id: action.action_id,
      agent_id: agentId,
      action_data: action.data,
    });

    await esClient.index(
      {
        index: AGENT_ACTIONS_RESULTS_INDEX,
        body: actionResponse,
      },
      ES_INDEX_OPTIONS
    );
  }

  // Add edge cases (maybe)
  if (fleetActionGenerator.randomFloat() < 0.3) {
    const randomFloat = fleetActionGenerator.randomFloat();

    // 60% of the time just add either an Isoalte -OR- an UnIsolate action
    if (randomFloat < 0.6) {
      let action: EndpointAction;

      if (randomFloat < 0.3) {
        // add a pending isolation
        action = fleetActionGenerator.generateIsolateAction({
          '@timestamp': new Date().toISOString(),
        });
      } else {
        // add a pending UN-isolation
        action = fleetActionGenerator.generateUnIsolateAction({
          '@timestamp': new Date().toISOString(),
        });
      }

      action.agents = [agentId];

      await esClient.index(
        {
          index: AGENT_ACTIONS_INDEX,
          body: action,
        },
        ES_INDEX_OPTIONS
      );
    } else {
      // Else (40% of the time) add a pending isolate AND pending un-isolate
      const action1 = fleetActionGenerator.generateIsolateAction({
        '@timestamp': new Date().toISOString(),
      });
      const action2 = fleetActionGenerator.generateUnIsolateAction({
        '@timestamp': new Date().toISOString(),
      });

      action1.agents = [agentId];
      action2.agents = [agentId];

      await Promise.all([
        esClient.index(
          {
            index: AGENT_ACTIONS_INDEX,
            body: action1,
          },
          ES_INDEX_OPTIONS
        ),
        esClient.index(
          {
            index: AGENT_ACTIONS_INDEX,
            body: action2,
          },
          ES_INDEX_OPTIONS
        ),
      ]);
    }
  }
};

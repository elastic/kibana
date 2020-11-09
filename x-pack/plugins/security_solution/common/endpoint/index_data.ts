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
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  GetPackagesResponse,
  PostAgentEnrollRequest,
  AGENT_API_ROUTES,
  AGENT_POLICY_API_ROUTES,
  EPM_API_ROUTES,
  PACKAGE_POLICY_API_ROUTES,
  ENROLLMENT_API_KEY_ROUTES,
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
  PostAgentEnrollResponse,
  PostAgentCheckinRequest,
  PostAgentCheckinResponse,
  PostAgentAcksResponse,
  PostAgentAcksRequest,
} from '../../../fleet/common';
import { factory as policyConfigFactory } from './models/policy_config';
import { HostMetadata } from './types';
import { KbnClientWithApiKeySupport } from '../../scripts/endpoint/kbn_client_with_api_key_support';

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
  let hostMetadata: HostMetadata;
  let wasAgentEnrolled = false;
  let enrolledAgent: undefined | PostAgentEnrollResponse['item'];

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
        enrolledAgent = await fleetEnrollAgentForHost(
          kbnClient,
          hostMetadata!,
          realPolicies[appliedPolicyId].policy_id
        );
      }
      // Update the Host metadata record with the ID of the "real" policy along with the enrolled agent id
      hostMetadata = {
        ...hostMetadata,
        elastic: {
          ...hostMetadata.elastic,
          agent: {
            ...hostMetadata.elastic.agent,
            id: enrolledAgent?.id ?? hostMetadata.elastic.agent.id,
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
    name: `Policy for ${policyName}`,
    description: '',
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

const fleetEnrollAgentForHost = async (
  kbnClient: KbnClientWithApiKeySupport,
  endpointHost: HostMetadata,
  agentPolicyId: string
): Promise<undefined | PostAgentEnrollResponse['item']> => {
  // Get Enrollement key for host's applied policy
  const enrollmentApiKey = await kbnClient
    .request<GetEnrollmentAPIKeysResponse>({
      path: ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
      method: 'GET',
      query: {
        kuery: `fleet-enrollment-api-keys.policy_id:"${agentPolicyId}"`,
      },
    })
    .then((apiKeysResponse) => {
      const apiKey = apiKeysResponse.data.list[0];

      if (!apiKey) {
        return Promise.reject(
          new Error(`no API enrollment key found for agent policy id ${agentPolicyId}`)
        );
      }

      return kbnClient
        .request<GetOneEnrollmentAPIKeyResponse>({
          path: ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN.replace('{keyId}', apiKey.id),
          method: 'GET',
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.log('unable to retrieve enrollment api key for policy');
          return Promise.reject(error);
        });
    })
    .then((apiKeyDetailsResponse) => {
      return apiKeyDetailsResponse.data.item.api_key;
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      return '';
    });

  if (enrollmentApiKey.length === 0) {
    return;
  }

  const fetchKibanaVersion = async () => {
    const version = ((await kbnClient.request({
      path: '/api/status',
      method: 'GET',
    })) as AxiosResponse).data.version.number;
    if (!version) {
      // eslint-disable-next-line no-console
      console.log('failed to retrieve kibana version');
    }
    return version;
  };

  // Enroll an agent for the Host
  const body: PostAgentEnrollRequest['body'] = {
    type: 'PERMANENT',
    metadata: {
      local: {
        elastic: {
          agent: {
            version: await fetchKibanaVersion(),
          },
        },
        host: {
          architecture: 'x86_64',
          hostname: endpointHost.host,
          name: endpointHost.host,
          id: '1c032ec0-3a94-4d54-9ad2-c5610c0eaba4',
          ip: ['fe80::703b:b9e6:887d:7f5/64', '10.0.2.15/24', '::1/128', '127.0.0.1/8'],
          mac: ['08:00:27:d8:c5:c0'],
        },
        os: {
          family: 'windows',
          kernel: '10.0.19041.388 (WinBuild.160101.0800)',
          platform: 'windows',
          version: '10.0',
          name: 'Windows 10 Pro',
          full: 'Windows 10 Pro(10.0)',
        },
      },
      user_provided: {
        dev_agent_version: '0.0.1',
        region: 'us-east',
      },
    },
  };

  try {
    // First enroll the agent
    const res = await kbnClient.requestWithApiKey(AGENT_API_ROUTES.ENROLL_PATTERN, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'kbn-xsrf': 'xxx',
        Authorization: `ApiKey ${enrollmentApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (res) {
      const enrollObj: PostAgentEnrollResponse = await res.json();
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error('unable to enroll agent', enrollObj);
        return;
      }
      // ------------------------------------------------
      // now check the agent in so that it can complete enrollment
      const checkinBody: PostAgentCheckinRequest['body'] = {
        events: [
          {
            type: 'STATE',
            subtype: 'RUNNING',
            message: 'state changed from STOPPED to RUNNING',
            timestamp: new Date().toISOString(),
            payload: {
              random: 'data',
              state: 'RUNNING',
              previous_state: 'STOPPED',
            },
            agent_id: enrollObj.item.id,
          },
        ],
      };
      const checkinRes = await kbnClient
        .requestWithApiKey(
          AGENT_API_ROUTES.CHECKIN_PATTERN.replace('{agentId}', enrollObj.item.id),
          {
            method: 'POST',
            body: JSON.stringify(checkinBody),
            headers: {
              'kbn-xsrf': 'xxx',
              Authorization: `ApiKey ${enrollObj.item.access_api_key}`,
              'Content-Type': 'application/json',
            },
          }
        )
        .catch((error) => {
          return Promise.reject(error);
        });

      // Agent unenrolling?
      if (checkinRes.status === 403) {
        return;
      }

      const checkinObj: PostAgentCheckinResponse = await checkinRes.json();
      if (!checkinRes.ok) {
        // eslint-disable-next-line no-console
        console.error(
          `failed to checkin agent [${enrollObj.item.id}] for endpoint [${endpointHost.host.id}]`
        );
        return enrollObj.item;
      }

      // ------------------------------------------------
      // If we have an action to ack(), then do it now
      if (checkinObj.actions.length) {
        const ackActionBody: PostAgentAcksRequest['body'] = {
          // @ts-ignore
          events: checkinObj.actions.map<PostAgentAcksRequest['body']['events'][0]>((action) => {
            return {
              action_id: action.id,
              type: 'ACTION_RESULT',
              subtype: 'CONFIG',
              timestamp: new Date().toISOString(),
              agent_id: action.agent_id,
              policy_id: agentPolicyId,
              message: `endpoint generator: Endpoint Started`,
            };
          }),
        };
        const ackActionResp = await kbnClient.requestWithApiKey(
          AGENT_API_ROUTES.ACKS_PATTERN.replace('{agentId}', enrollObj.item.id),
          {
            method: 'POST',
            body: JSON.stringify(ackActionBody),
            headers: {
              'kbn-xsrf': 'xxx',
              Authorization: `ApiKey ${enrollObj.item.access_api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const ackActionObj: PostAgentAcksResponse = await ackActionResp.json();
        if (!ackActionResp.ok) {
          // eslint-disable-next-line no-console
          console.error(
            `failed to ACK Actions provided to agent [${enrollObj.item.id}] for endpoint [${endpointHost.host.id}]`
          );
          // eslint-disable-next-line no-console
          console.error(JSON.stringify(ackActionObj, null, 2));
          return enrollObj.item;
        }
      }

      return enrollObj.item;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

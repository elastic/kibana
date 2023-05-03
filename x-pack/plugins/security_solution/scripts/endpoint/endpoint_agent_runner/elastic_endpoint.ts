/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userInfo } from 'os';
import execa from 'execa';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  packagePolicyRouteService,
  type UpdatePackagePolicyResponse,
  type UpdatePackagePolicy,
} from '@kbn/fleet-plugin/common';
import chalk from 'chalk';
import { createAndEnrollEndpointHost } from '../common/endpoint_host_services';
import { getEndpointPackageInfo } from '../../../common/endpoint/utils/package';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { fetchAgentPolicyList } from '../common/fleet_services';
import { getRuntimeServices } from './runtime';
import { type PolicyData, ProtectionModes } from '../../../common/endpoint/types';
import { dump } from './utils';

export const enrollEndpointHost = async (): Promise<string | undefined> => {
  let vmName;
  const {
    log,
    kbnClient,
    options: { version, policy },
  } = getRuntimeServices();

  log.info(`Creating VM and enrolling Elastic Agent`);
  log.indent(4);

  try {
    const uniqueId = Math.random().toString().substring(2, 6);
    const username = userInfo().username.toLowerCase().replaceAll('.', '-'); // Multipass doesn't like periods in username
    const policyId: string = policy || (await getOrCreateAgentPolicyId());

    if (!policyId) {
      throw new Error(`No valid policy id provided or unable to create it`);
    }

    if (!version) {
      throw new Error(`No 'version' specified`);
    }

    vmName = `${username}-dev-${uniqueId}`;

    log.info(`Creating VM named: ${vmName}`);

    await createAndEnrollEndpointHost({
      kbnClient,
      log,
      hostname: vmName,
      agentPolicyId: policyId,
      version,
      useClosestVersionMatch: false,
      disk: '8G',
    });

    log.info(`VM created using Multipass.
    VM Name: ${vmName}
    Elastic Agent Version: ${version}

    Shell access: ${chalk.bold(`multipass shell ${vmName}`)}
    Delete VM:    ${chalk.bold(`multipass delete -p ${vmName}${await getVmCountNotice()}`)}
`);
  } catch (error) {
    log.error(dump(error));
    log.indent(-4);
    throw error;
  }

  log.indent(-4);

  return vmName;
};

const getOrCreateAgentPolicyId = async (): Promise<string> => {
  const { kbnClient, log } = getRuntimeServices();
  const username = userInfo().username.toLowerCase();
  const endpointPolicyName = `${username} test integration`;
  const agentPolicyName = `${username} test policy`;

  const existingPolicy = await fetchAgentPolicyList(kbnClient, {
    kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.name: "${agentPolicyName}"`,
  });

  if (existingPolicy.items[0]) {
    log.info(`Using existing Fleet test agent policy`);
    log.verbose(existingPolicy.items[0]);

    return existingPolicy.items[0].id;
  }

  // Create new policy
  const endpointPackageVersion = (await getEndpointPackageInfo(kbnClient)).version;
  const response = await indexFleetEndpointPolicy(
    kbnClient,
    endpointPolicyName,
    endpointPackageVersion,
    agentPolicyName
  );
  const agentPolicy = response.agentPolicies[0];

  // Update the Endpoint integration policy to enable all protections
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { created_by, created_at, updated_at, updated_by, id, version, revision, ...restOfPolicy } =
    response.integrationPolicies[0];
  const updatedEndpointPolicy: UpdatePackagePolicy = restOfPolicy;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const policy = updatedEndpointPolicy!.inputs[0]!.config!.policy.value;

  policy.mac.malware.mode = ProtectionModes.prevent;
  policy.windows.malware.mode = ProtectionModes.prevent;
  policy.linux.malware.mode = ProtectionModes.prevent;

  policy.mac.memory_protection.mode = ProtectionModes.prevent;
  policy.windows.memory_protection.mode = ProtectionModes.prevent;
  policy.linux.memory_protection.mode = ProtectionModes.prevent;

  policy.mac.behavior_protection.mode = ProtectionModes.prevent;
  policy.windows.behavior_protection.mode = ProtectionModes.prevent;
  policy.linux.behavior_protection.mode = ProtectionModes.prevent;

  policy.windows.ransomware.mode = ProtectionModes.prevent;

  response.integrationPolicies[0] = (
    await kbnClient
      .request<UpdatePackagePolicyResponse>({
        method: 'PUT',
        path: packagePolicyRouteService.getUpdatePath(response.integrationPolicies[0].id),
        body: updatedEndpointPolicy,
      })
      .then((res) => res.data)
  ).item as PolicyData;

  log.info(`New agent policy with Endpoint integration created:
  Name: ${agentPolicy.name}
  Id:   ${agentPolicy.id}`);

  log.verbose(JSON.stringify(response, null, 2));

  return agentPolicy.id ?? '';
};

const getVmCountNotice = async (threshold: number = 1): Promise<string> => {
  const response = await execa.command(`multipass list --format=json`);

  const output: { list: Array<{ ipv4: string; name: string; release: string; state: string }> } =
    JSON.parse(response.stdout);

  if (output.list.length > threshold) {
    return `

-----------------------------------------------------------------
${chalk.red('NOTE:')} ${chalk.bold(
      `You currently have ${output.list.length} VMs running.`
    )} Remember to delete those
      no longer being used.
      View running VMs: ${chalk.bold('multipass list')}
  -----------------------------------------------------------------
`;
  }

  return '';
};

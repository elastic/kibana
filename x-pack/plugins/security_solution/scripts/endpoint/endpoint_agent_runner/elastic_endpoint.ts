/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userInfo } from 'os';
import execa from 'execa';
import nodeFetch from 'node-fetch';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import chalk from 'chalk';
import { getEndpointPackageInfo } from '../../../common/endpoint/index_data';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  fetchAgentPolicyEnrollmentKey,
  fetchAgentPolicyList,
  fetchFleetServerUrl,
  waitForHostToEnroll,
} from '../common/fleet_services';
import { getRuntimeServices } from './runtime';

interface ElasticArtifactSearchResponse {
  manifest: {
    'last-update-time': string;
    'seconds-since-last-update': number;
  };
  packages: {
    [packageFileName: string]: {
      architecture: string;
      os: string[];
      type: string;
      asc_url: string;
      sha_url: string;
      url: string;
    };
  };
}

export const enrollEndpointHost = async () => {
  const {
    log,
    kbnClient,
    options: { version, policy },
  } = getRuntimeServices();

  log.info(`Creating VM and enrolling Elastic Agent`);
  log.indent(4);

  try {
    const uniqueId = Math.random().toString(32).substring(2).substring(0, 4);
    const username = userInfo().username.toLowerCase();
    const policyId: string = policy || (await getOrCreateAgentPolicyId());

    if (!policyId) {
      throw new Error(`No valid policy id provide or unable to create it`);
    }

    if (!version) {
      throw new Error(`No 'version' specified`);
    }

    const [fleetServerHostUrl, enrollmentToken] = await Promise.all([
      fetchFleetServerUrl(kbnClient),
      fetchAgentPolicyEnrollmentKey(kbnClient, policyId),
    ]);

    if (!fleetServerHostUrl) {
      throw new Error(`Fleet setting does not have a Fleet Server host defined!`);
    }

    if (!enrollmentToken) {
      throw new Error(`No API enrollment key found for policy id [${policyId}]`);
    }

    const vmName = `${username}-dev-${uniqueId}`;

    log.info(`Creating VM named: ${vmName}`);

    await execa.command(`multipass launch --name ${vmName}`);

    log.verbose(await execa('multipass', ['info', vmName]));

    const agentDownloadUrl = await getAgentDownloadUrl(version);
    const agentDownloadedFile = agentDownloadUrl.substring(agentDownloadUrl.lastIndexOf('/') + 1);
    const vmDirName = agentDownloadedFile.replace(/\.tar\.gz$/, '');

    log.info(`Downloading and installing agent`);
    log.verbose(`Agent download:\n    ${agentDownloadUrl}`);

    await execa.command(
      `multipass exec ${vmName} -- curl -L ${agentDownloadUrl} -o ${agentDownloadedFile}`
    );
    await execa.command(`multipass exec ${vmName} -- tar -zxf ${agentDownloadedFile}`);
    await execa.command(`multipass exec ${vmName} -- rm -f ${agentDownloadedFile}`);

    const agentEnrollArgs = [
      'exec',

      vmName,

      '--working-directory',
      `/home/ubuntu/${vmDirName}`,

      '--',

      'sudo',

      './elastic-agent',

      'enroll',

      '--insecure',

      '--force',

      '--url',
      fleetServerHostUrl,

      '--enrollment-token',
      enrollmentToken,
    ];

    log.info(`Enrolling elastic agent with Fleet`);
    log.verbose(`Command: multipass ${agentEnrollArgs.join(' ')}`);

    await execa(`multipass`, agentEnrollArgs);

    const runAgentCommand = `multipass exec ${vmName} --working-directory /home/ubuntu/${vmDirName} -- sudo ./elastic-agent \&>/dev/null`;

    log.info(`Running elastic agent`);
    log.verbose(`Command: ${runAgentCommand}`);

    // About `timeout` option below
    // The `multipass exec` command seems to have some issues when a command pass to it redirects output,
    // as is with the command that runs endpoint. See https://github.com/canonical/multipass/issues/667
    // To get around it, `timeout` is set to 5s, which should be enough time for the command to be executed
    // in the VM.
    await execa.command(runAgentCommand, { timeout: 5000 }).catch((error) => {
      if (error.originalMessage !== 'Timed out') {
        throw error;
      }
    });

    log.info(`Waiting for Agent to check-in with Fleet`);
    await waitForHostToEnroll(kbnClient, vmName);

    log.info(`VM created using Multipass.
    VM Name: ${vmName}
    Elastic Agent Version: ${version}

    Shell access: ${chalk.bold(`multipass shell ${vmName}`)}
    Delete VM:    ${chalk.bold(`multipass delete -p ${vmName}${await getVmCountNotice()}`)}
`);
  } catch (error) {
    log.error(error);
    log.indent(-4);
    throw error;
  }

  log.indent(-4);
};

const getAgentDownloadUrl = async (version: string): Promise<string> => {
  const { log } = getRuntimeServices();
  // TODO:PT use arch and platform of VM to build download file name below (will be needed if tools ever supports different types of VMs)
  const agentFile = `elastic-agent-${version}-linux-arm64.tar.gz`;
  const artifactSearchUrl = `https://artifacts-api.elastic.co/v1/search/${version}/${agentFile}`;

  log.verbose(`Retrieving elastic agent download URL from:\n    ${artifactSearchUrl}`);

  const searchResult: ElasticArtifactSearchResponse = await nodeFetch(artifactSearchUrl).then(
    (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to search elastic's artifact repository: ${response.statusText} (HTTP ${response.status})`
        );
      }

      return response.json();
    }
  );

  log.verbose(searchResult);

  if (!searchResult.packages[agentFile]) {
    throw new Error(`Unable to find an Agent download URL for version [${version}]`);
  }

  return searchResult.packages[agentFile].url;
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

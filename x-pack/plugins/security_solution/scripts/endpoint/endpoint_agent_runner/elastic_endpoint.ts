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
import { getEndpointPackageInfo } from '../../../common/endpoint/index_data';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  fetchAgentPolicyEnrollmentKey,
  fetchAgentPolicyList,
  fetchFleetServerUrl,
  waitForHostToEnroll,
} from '../common/fleet_services';
import { getRuntimeServices } from './runtime';

export const enrollEndpointHost = async (agentPolicyId?: string) => {
  const { log, kbnClient } = getRuntimeServices();

  log.info(`Creating VM and enrolling Elastic Agent`);
  log.indent(4);

  try {
    const uniqueId = Math.random().toString(32).substring(2).substring(0, 4);
    const username = userInfo().username.toLowerCase();
    const policyId: string = agentPolicyId || (await getOrCreateAgentPolicyId());

    if (!policyId) {
      throw new Error(`No valid policy id provide or unable to create it`);
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

    // FIXME:PT need to get the version from input args
    const agentDownloadUrl = await getAgentDownloadUrl('8.7.0-SNAPSHOT');
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

    log.info(`Waiting for Agent to checkin with Fleet`);
    await waitForHostToEnroll(kbnClient, vmName);

    log.info(`VM created using Multipass.
    VM Name: ${vmName}

    Shell access: multipass shell ${vmName}
    Delete VM:    multipass delete -p ${vmName}${await getVmCountNotice()}
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
  const isSnapshot = version.indexOf(`SNAPSHOT`);
  let urlRoot = `https://artifacts.elastic.co/downloads/beats/elastic-agent`;
  // const archType = arch(); // FIXME:PT use arch and maybe platform to build download file name
  const agentFile = `/elastic-agent-${version}-linux-arm64.tar.gz`;

  // FIXME:PT use https://artifacts-api.elastic.co/v1/search/8.7.0-SNAPSHOT for urls below, which has both prod adn snapshot version listed.

  if (isSnapshot) {
    const snapshotDownloadsInfoUrl = 'https://snapshots.elastic.co/latest/master.json';
    const snapshotRepoInfo: { build_id: string } = await nodeFetch(snapshotDownloadsInfoUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`${response.statusText} (HTTP ${response.status})`);
        }

        return response.json();
      })
      .catch((error) => {
        log.verbose(`Attempt to retrieve [${snapshotDownloadsInfoUrl}] failed with: ${error}`);
        throw error;
      });

    urlRoot = `https://snapshots.elastic.co/${snapshotRepoInfo.build_id}/downloads/beats/elastic-agent`;
  }

  return `${urlRoot}${agentFile}`;
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
NOTE: You currently have ${output.list.length} VMs running. Remember to delete those
      no longer being used.
      View running VMs: multipass list
  -----------------------------------------------------------------
`;
  }

  return '';
};

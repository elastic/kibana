/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userInfo } from 'os';
import execa from 'execa';
import { getEndpointPackageInfo } from '../../../common/endpoint/index_data';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { fetchAgentPolicyEnrollmentKey, fetchFleetServerUrl } from '../common/fleet_services';
import { getRuntimeServices } from './runtime';

export const enrollEndpointHost = async (agentPolicyId?: string) => {
  const { log, kbnClient } = getRuntimeServices();

  log.info(`Creating VM and enrolling Elastic agent with Endpoint`);
  log.indent(4);

  try {
    const uniqueId = Math.random().toString(32).substring(2).substring(0, 4);
    const endpointPackageVersion = (await getEndpointPackageInfo(kbnClient)).version;
    const username = userInfo().username.toLowerCase();

    // FIXME:PT try to limit how many policies are created
    const policyId: string =
      agentPolicyId ||
      (await indexFleetEndpointPolicy(
        kbnClient,
        `${username} policy ${uniqueId}`,
        endpointPackageVersion
      )
        .then((response) => {
          const agentPolicy = response.agentPolicies[0];

          log.info(`New agent policy with Endpoint integration created in fleet:
    Name: ${agentPolicy.name}
    Id:   ${agentPolicy.id}`);

          log.verbose(JSON.stringify(response, null, 2));

          return agentPolicy.id ?? '';
        })
        .catch((error) => {
          log.verbose(error);
          throw error;
        }));

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
    const agentFile = agentDownloadUrl.substring(agentDownloadUrl.lastIndexOf('/') + 1);
    const vmDirName = agentFile.replace(/\.tar\.gz$/, '');

    log.info(`Downloading and installing agent from:\n    ${agentDownloadUrl}`);

    await execa.command(`multipass exec ${vmName} -- curl -L ${agentDownloadUrl} -o ${agentFile}`);
    await execa.command(`multipass exec ${vmName} -- tar -zxf ${agentFile}`);
    await execa.command(`multipass exec ${vmName} -- rm -f ${agentFile}`);

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

    log.info(`VM created using Multipass.
    VM Name: ${vmName}

    Shell access: multipass shell ${vmName}
    Delete VM:    multipass delete -p ${vmName}

`);
    // FIXME:PT show count of VMs currently running (to remind developer to check list
  } catch (error) {
    log.error(error);
    log.indent(-4);
    throw error;
  }

  log.indent(-4);
};

const getAgentDownloadUrl = async (version: string): Promise<string> => {
  const isSnapshot = version.indexOf(`SNAPSHOT`);
  let urlRoot = `https://artifacts.elastic.co/downloads/beats/elastic-agent`;
  // const archType = arch(); // FIXME:PT use arch and maybe platform to build download file name
  const agentFile = `/elastic-agent-${version}-linux-arm64.tar.gz`;

  if (isSnapshot) {
    // Call: https://snapshots.elastic.co/latest/master.json
    //      get `build_id`
    // then build URL:
    //    https://snapshots.elastic.co/8.7.0-1604eae1/downloads/beats/elastic-agent/elastic-agent-8.7.0-SNAPSHOT-linux-arm64.tar.gz

    urlRoot = `https://snapshots.elastic.co/8.7.0-1604eae1/downloads/beats/elastic-agent`;
  }

  return `${urlRoot}${agentFile}`;
};

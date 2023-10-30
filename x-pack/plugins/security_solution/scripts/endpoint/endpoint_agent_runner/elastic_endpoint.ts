/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userInfo } from 'os';
import execa from 'execa';
import chalk from 'chalk';
import { createAndEnrollEndpointHost } from '../common/endpoint_host_services';
import {
  addEndpointIntegrationToAgentPolicy,
  getOrCreateDefaultAgentPolicy,
} from '../common/fleet_services';
import { getRuntimeServices } from './runtime';
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

    if (process.env.CI) {
      log.info(`VM created using Vagrant.
      VM Name: ${vmName}
      Elastic Agent Version: ${version}

      Shell access: ${chalk.bold(`vagrant ssh ${vmName}`)}
      Delete VM:    ${chalk.bold(`vagrant destroy ${vmName} -f`)}
  `);
    } else {
      log.info(`VM created using Multipass.
        VM Name: ${vmName}
        Elastic Agent Version: ${version}

        Shell access: ${chalk.bold(`multipass shell ${vmName}`)}
        Delete VM:    ${chalk.bold(`multipass delete -p ${vmName}${await getVmCountNotice()}`)}
    `);
    }
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
  const agentPolicy = await getOrCreateDefaultAgentPolicy({ kbnClient, log });

  await addEndpointIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId: agentPolicy.id });

  return agentPolicy.id;
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

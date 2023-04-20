/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import assert from 'assert';
import {
  fetchAgentPolicyEnrollmentKey,
  fetchFleetServerUrl,
  getAgentDownloadUrl,
  unEnrollFleetAgent,
  waitForHostToEnroll,
} from './fleet_services';

export interface CreateAndEnrollEndpointHostOptions
  extends Pick<CreateMultipassVmOptions, 'disk' | 'cpus' | 'memory'> {
  kbnClient: KbnClient;
  log: ToolingLog;
  /** The fleet Agent Policy ID to use for enrolling the agent */
  agentPolicyId: string;
  /** version of the Agent to install. Defaults to stack version */
  version?: string;
  /** The name for the host. Will also be the name of the VM */
  hostname?: string;
}

export interface CreateAndEnrollEndpointHostResponse {
  hostname: string;
  agentId: string;
}

/**
 * Creates a new virtual machine (host) and enrolls that with Fleet
 */
export const createAndEnrollEndpointHost = async ({
  kbnClient,
  log,
  agentPolicyId,
  cpus,
  disk,
  memory,
  hostname,
  version = kibanaPackageJson.version,
}: CreateAndEnrollEndpointHostOptions): Promise<CreateAndEnrollEndpointHostResponse> => {
  const [vm, agentDownloadUrl, fleetServerUrl, enrollmentToken] = await Promise.all([
    createMultipassVm({
      vmName: hostname ?? `test-host-${Math.random().toString().substring(2, 6)}`,
      disk,
      cpus,
      memory,
    }),

    getAgentDownloadUrl(version, true, log),

    fetchFleetServerUrl(kbnClient),

    fetchAgentPolicyEnrollmentKey(kbnClient, agentPolicyId),
  ]);

  // Some validations before we proceed
  assert(agentDownloadUrl, 'Missing agent download URL');
  assert(fleetServerUrl, 'Fleet server URL not set');
  assert(enrollmentToken, `No enrollment token for agent policy id [${agentPolicyId}]`);

  log.verbose(`Enrolling host [${vm.vmName}]
  with fleet-server [${fleetServerUrl}]
  using enrollment token [${enrollmentToken}]`);

  const { agentId } = await enrollHostWithFleet({
    kbnClient,
    log,
    fleetServerUrl,
    agentDownloadUrl,
    enrollmentToken,
    vmName: vm.vmName,
  });

  return {
    hostname: vm.vmName,
    agentId,
  };
};

/**
 * Destroys the Endpoint Host VM and un-enrolls the Fleet agent
 * @param kbnClient
 * @param createdHost
 */
export const destroyEndpointHost = async (
  kbnClient: KbnClient,
  createdHost: CreateAndEnrollEndpointHostResponse
): Promise<void> => {
  await Promise.all([
    deleteMultipassVm(createdHost.hostname),
    unEnrollFleetAgent(kbnClient, createdHost.agentId, true),
  ]);
};

interface CreateMultipassVmOptions {
  vmName: string;
  /** Number of CPUs */
  cpus?: number;
  /** Disk size */
  disk?: string;
  /** Amount of memory */
  memory?: string;
}

interface CreateMultipassVmResponse {
  vmName: string;
}

/**
 * Creates a new VM using `multipass`
 */
const createMultipassVm = async ({
  vmName,
  disk = '8G',
  cpus = 1,
  memory = '1G',
}: CreateMultipassVmOptions): Promise<CreateMultipassVmResponse> => {
  await execa.command(
    `multipass launch --name ${vmName} --disk ${disk} --cpus ${cpus} --memory ${memory}`
  );

  return {
    vmName,
  };
};

const deleteMultipassVm = async (vmName: string): Promise<void> => {
  await execa.command(`multipass delete -p ${vmName}`);
};

interface EnrollHostWithFleetOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  vmName: string;
  agentDownloadUrl: string;
  fleetServerUrl: string;
  enrollmentToken: string;
}

const enrollHostWithFleet = async ({
  kbnClient,
  log,
  vmName,
  fleetServerUrl,
  agentDownloadUrl,
  enrollmentToken,
}: EnrollHostWithFleetOptions): Promise<{ agentId: string }> => {
  const agentDownloadedFile = agentDownloadUrl.substring(agentDownloadUrl.lastIndexOf('/') + 1);
  const vmDirName = agentDownloadedFile.replace(/\.tar\.gz$/, '');

  await execa.command(
    `multipass exec ${vmName} -- curl -L ${agentDownloadUrl} -o ${agentDownloadedFile}`
  );
  await execa.command(`multipass exec ${vmName} -- tar -zxf ${agentDownloadedFile}`);
  await execa.command(`multipass exec ${vmName} -- rm -f ${agentDownloadedFile}`);

  const agentInstallArguments = [
    'exec',

    vmName,

    '--working-directory',
    `/home/ubuntu/${vmDirName}`,

    '--',

    'sudo',

    './elastic-agent',

    'install',

    '--insecure',

    '--force',

    '--url',
    fleetServerUrl,

    '--enrollment-token',
    enrollmentToken,
  ];

  log.info(`Enrolling elastic agent with Fleet`);
  log.verbose(`Command: multipass ${agentInstallArguments.join(' ')}`);

  await execa(`multipass`, agentInstallArguments);

  log.info(`Waiting for Agent to check-in with Fleet`);
  const agent = await waitForHostToEnroll(kbnClient, vmName, 120000);

  return {
    agentId: agent.id,
  };
};

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
import type { HostVm } from './types';
import type { BaseVmCreateOptions } from './vm_services';
import { createMultipassHostVmClient, createVagrantHostVmClient, createVm } from './vm_services';
import type { DownloadedAgentInfo } from './agent_downloads_service';
import { cleanupDownloads, downloadAndStoreAgent } from './agent_downloads_service';
import {
  fetchAgentPolicyEnrollmentKey,
  fetchFleetServerUrl,
  getAgentDownloadUrl,
  unEnrollFleetAgent,
  waitForHostToEnroll,
} from './fleet_services';

export const VAGRANT_CWD = `${__dirname}/../endpoint_agent_runner/`;

export interface CreateAndEnrollEndpointHostOptions
  extends Pick<BaseVmCreateOptions, 'disk' | 'cpus' | 'memory'> {
  kbnClient: KbnClient;
  log: ToolingLog;
  /** The fleet Agent Policy ID to use for enrolling the agent */
  agentPolicyId: string;
  /** version of the Agent to install. Defaults to stack version */
  version?: string;
  /** The name for the host. Will also be the name of the VM */
  hostname?: string;
  /** If `version` should be exact, or if this is `true`, then the closest version will be used. Defaults to `false` */
  useClosestVersionMatch?: boolean;
  /** If the local cache of agent downloads should be used. Defaults to `true` */
  useCache?: boolean;
}

export interface CreateAndEnrollEndpointHostResponse {
  hostname: string;
  agentId: string;
  hostVm: HostVm;
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
  useClosestVersionMatch = false,
  useCache = true,
}: CreateAndEnrollEndpointHostOptions): Promise<CreateAndEnrollEndpointHostResponse> => {
  let cacheCleanupPromise: ReturnType<typeof cleanupDownloads> = Promise.resolve({
    deleted: [],
  });

  const vmName = hostname ?? `test-host-${Math.random().toString().substring(2, 6)}`;

  const agentDownload = await getAgentDownloadUrl(version, useClosestVersionMatch, log).then<{
    url: string;
    cache?: DownloadedAgentInfo;
  }>(({ url }) => {
    if (useCache) {
      cacheCleanupPromise = cleanupDownloads();

      return downloadAndStoreAgent(url).then((cache) => {
        return {
          url,
          cache,
        };
      });
    }

    return { url };
  });

  const [hostVm, fleetServerUrl, enrollmentToken] = await Promise.all([
    process.env.CI
      ? createVm({
          type: 'vagrant',
          name: vmName,
          log,
          agentDownload: agentDownload.cache as DownloadedAgentInfo,
        })
      : createVm({
          type: 'multipass',
          log,
          name: vmName,
          disk,
          cpus,
          memory,
        }),

    fetchFleetServerUrl(kbnClient),

    fetchAgentPolicyEnrollmentKey(kbnClient, agentPolicyId),
  ]);

  // Some validations before we proceed
  assert(agentDownload.url, 'Missing agent download URL');
  assert(fleetServerUrl, 'Fleet server URL not set');
  assert(enrollmentToken, `No enrollment token for agent policy id [${agentPolicyId}]`);

  log.verbose(`Enrolling host [${hostVm.name}]
  with fleet-server [${fleetServerUrl}]
  using enrollment token [${enrollmentToken}]`);

  const { agentId } = await enrollHostWithFleet({
    kbnClient,
    log,
    fleetServerUrl,
    agentDownloadUrl: agentDownload.url,
    cachedAgentDownload: agentDownload.cache,
    enrollmentToken,
    hostVm,
  });

  await cacheCleanupPromise.then((results) => {
    if (results.deleted.length > 0) {
      log.verbose(`Agent Downloads cache directory was cleaned up and the following ${
        results.deleted.length
      } were deleted:
${results.deleted.join('\n')}
`);
    }
  });

  return {
    hostname: hostVm.name,
    agentId,
    hostVm,
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

export const deleteMultipassVm = async (vmName: string): Promise<void> => {
  const hostVm = process.env.CI
    ? createVagrantHostVmClient(vmName)
    : createMultipassHostVmClient(vmName);

  await hostVm.destroy();
};

interface EnrollHostWithFleetOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  hostVm: HostVm;
  agentDownloadUrl: string;
  cachedAgentDownload?: DownloadedAgentInfo;
  fleetServerUrl: string;
  enrollmentToken: string;
}

const enrollHostWithFleet = async ({
  kbnClient,
  log,
  hostVm,
  fleetServerUrl,
  agentDownloadUrl,
  cachedAgentDownload,
  enrollmentToken,
}: EnrollHostWithFleetOptions): Promise<{ agentId: string }> => {
  const agentDownloadedFile = agentDownloadUrl.substring(agentDownloadUrl.lastIndexOf('/') + 1);
  const vmDirName = agentDownloadedFile.replace(/\.tar\.gz$/, '');
  const vmName = hostVm.name;

  // For multipass VMs, we need to get the Agent archive into the VM and extract it
  // (Vagrant VMs already has it in the VM created)
  if (hostVm.type === 'multipass') {
    const downloadsHostVmMountedDir = '~/_agent_downloads';

    if (cachedAgentDownload) {
      log.debug(
        `Installing agent on host using cached download from [${cachedAgentDownload.fullFilePath}]`
      );

      log.debug(`mounting [${cachedAgentDownload.directory}] to [${downloadsHostVmMountedDir}]`);
      await hostVm.mount(cachedAgentDownload.directory, downloadsHostVmMountedDir);

      log.debug(`Extracting ${cachedAgentDownload.filename}`);
      await hostVm.exec(`tar -zxf _agent_downloads/${cachedAgentDownload.filename}`);

      log.debug(`un-mounting [${downloadsHostVmMountedDir}]`);
    } else {
      log.debug(`Downloading Agent to host VM: ${agentDownloadUrl}`);

      await execa.command(
        `multipass exec ${vmName} -- curl -L ${agentDownloadUrl} -o ${agentDownloadedFile}`
      );
      await execa.command(`multipass exec ${vmName} -- tar -zxf ${agentDownloadedFile}`);
      await execa.command(`multipass exec ${vmName} -- rm -f ${agentDownloadedFile}`);
    }
  }

  const agentInstallCommand = [
    'sudo',

    './elastic-agent',

    'install',

    '--insecure',

    '--force',

    '--url',
    fleetServerUrl,

    '--enrollment-token',
    enrollmentToken,
  ].join(' ');

  log.info(`Enrolling elastic agent with Fleet`);
  log.debug(`Agent enroll command:\n${agentInstallCommand}`);

  await hostVm.exec(`cd ${vmDirName} && ${agentInstallCommand}`);

  log.info(`Waiting for Agent to check-in with Fleet`);
  const agent = await waitForHostToEnroll(kbnClient, vmName, 8 * 60 * 1000);

  log.info(`Agent enrolled with Fleet, status: `, agent.status);

  return {
    agentId: agent.id,
  };
};

export async function stopEndpointHost(hostName: string): Promise<void> {
  const hostVm = process.env.CI
    ? createVagrantHostVmClient(hostName)
    : createMultipassHostVmClient(hostName);

  await hostVm.stop();
}

export async function startEndpointHost(hostName: string): Promise<void> {
  const hostVm = process.env.CI
    ? createVagrantHostVmClient(hostName)
    : createMultipassHostVmClient(hostName);

  await hostVm.start();
}

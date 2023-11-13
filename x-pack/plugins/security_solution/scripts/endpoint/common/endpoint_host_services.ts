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
  extends Pick<CreateMultipassVmOptions, 'disk' | 'cpus' | 'memory'> {
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

  const [vm, fleetServerUrl, enrollmentToken] = await Promise.all([
    process.env.CI
      ? createVagrantVm({
          vmName,
          log,
          cachedAgentDownload: agentDownload.cache as DownloadedAgentInfo,
        })
      : createMultipassVm({
          vmName,
          disk,
          cpus,
          memory,
        }),

    fetchFleetServerUrl(kbnClient),

    fetchAgentPolicyEnrollmentKey(kbnClient, agentPolicyId),
  ]);

  if (!process.env.CI) {
    log.verbose(await execa('multipass', ['info', vm.vmName]));
  }

  // Some validations before we proceed
  assert(agentDownload.url, 'Missing agent download URL');
  assert(fleetServerUrl, 'Fleet server URL not set');
  assert(enrollmentToken, `No enrollment token for agent policy id [${agentPolicyId}]`);

  log.verbose(`Enrolling host [${vm.vmName}]
  with fleet-server [${fleetServerUrl}]
  using enrollment token [${enrollmentToken}]`);

  const { agentId } = await enrollHostWithFleet({
    kbnClient,
    log,
    fleetServerUrl,
    agentDownloadUrl: agentDownload.url,
    cachedAgentDownload: agentDownload.cache,
    enrollmentToken,
    vmName: vm.vmName,
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

interface CreateVmResponse {
  vmName: string;
}

interface CreateVagrantVmOptions {
  vmName: string;
  cachedAgentDownload: DownloadedAgentInfo;
  log: ToolingLog;
}

/**
 * Creates a new VM using `vagrant`
 */
const createVagrantVm = async ({
  vmName,
  cachedAgentDownload,
  log,
}: CreateVagrantVmOptions): Promise<CreateVmResponse> => {
  try {
    await execa.command(`vagrant destroy -f`, {
      env: {
        VAGRANT_CWD,
      },
      // Only `pipe` STDERR to parent process
      stdio: ['inherit', 'inherit', 'pipe'],
    });
    // eslint-disable-next-line no-empty
  } catch (e) {}

  try {
    await execa.command(`vagrant up`, {
      env: {
        VAGRANT_DISABLE_VBOXSYMLINKCREATE: '1',
        VAGRANT_CWD,
        VMNAME: vmName,
        CACHED_AGENT_SOURCE: cachedAgentDownload.fullFilePath,
        CACHED_AGENT_FILENAME: cachedAgentDownload.filename,
      },
      // Only `pipe` STDERR to parent process
      stdio: ['inherit', 'inherit', 'pipe'],
    });
  } catch (e) {
    log.error(e);
    throw e;
  }

  return {
    vmName,
  };
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

/**
 * Creates a new VM using `multipass`
 */
const createMultipassVm = async ({
  vmName,
  disk = '8G',
  cpus = 1,
  memory = '1G',
}: CreateMultipassVmOptions): Promise<CreateVmResponse> => {
  await execa.command(
    `multipass launch --name ${vmName} --disk ${disk} --cpus ${cpus} --memory ${memory}`
  );

  return {
    vmName,
  };
};

export const deleteMultipassVm = async (vmName: string): Promise<void> => {
  if (process.env.CI) {
    await execa.command(`vagrant destroy -f`, {
      env: {
        VAGRANT_CWD,
      },
    });
  } else {
    await execa.command(`multipass delete -p ${vmName}`);
  }
};

interface EnrollHostWithFleetOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  vmName: string;
  agentDownloadUrl: string;
  cachedAgentDownload?: DownloadedAgentInfo;
  fleetServerUrl: string;
  enrollmentToken: string;
}

const enrollHostWithFleet = async ({
  kbnClient,
  log,
  vmName,
  fleetServerUrl,
  agentDownloadUrl,
  cachedAgentDownload,
  enrollmentToken,
}: EnrollHostWithFleetOptions): Promise<{ agentId: string }> => {
  const agentDownloadedFile = agentDownloadUrl.substring(agentDownloadUrl.lastIndexOf('/') + 1);
  const vmDirName = agentDownloadedFile.replace(/\.tar\.gz$/, '');

  if (cachedAgentDownload) {
    log.verbose(
      `Installing agent on host using cached download from [${cachedAgentDownload.fullFilePath}]`
    );

    if (!process.env.CI) {
      // mount local folder on VM
      await execa.command(
        `multipass mount ${cachedAgentDownload.directory} ${vmName}:~/_agent_downloads`
      );
      await execa.command(
        `multipass exec ${vmName} -- tar -zxf _agent_downloads/${cachedAgentDownload.filename}`
      );
      await execa.command(`multipass unmount ${vmName}:~/_agent_downloads`);
    }
  } else {
    log.verbose(`downloading and installing agent from URL [${agentDownloadUrl}]`);

    if (!process.env.CI) {
      // download into VM
      await execa.command(
        `multipass exec ${vmName} -- curl -L ${agentDownloadUrl} -o ${agentDownloadedFile}`
      );
      await execa.command(`multipass exec ${vmName} -- tar -zxf ${agentDownloadedFile}`);
      await execa.command(`multipass exec ${vmName} -- rm -f ${agentDownloadedFile}`);
    }
  }

  const agentInstallArguments = [
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
  if (process.env.CI) {
    log.verbose(`Command: vagrant ${agentInstallArguments.join(' ')}`);

    await execa(`vagrant`, ['ssh', '--', `cd ${vmDirName} && ${agentInstallArguments.join(' ')}`], {
      env: {
        VAGRANT_CWD,
      },
      // Only `pipe` STDERR to parent process
      stdio: ['inherit', 'inherit', 'pipe'],
    });
  } else {
    log.verbose(`Command: multipass ${agentInstallArguments.join(' ')}`);

    await execa(`multipass`, [
      'exec',
      vmName,
      '--working-directory',
      `/home/ubuntu/${vmDirName}`,

      '--',
      ...agentInstallArguments,
    ]);
  }
  log.info(`Waiting for Agent to check-in with Fleet`);

  const agent = await waitForHostToEnroll(kbnClient, vmName, 8 * 60 * 1000);

  log.info(`Agent enrolled with Fleet, status: `, agent.status);

  return {
    agentId: agent.id,
  };
};

export async function getEndpointHosts(): Promise<
  Array<{ name: string; state: string; ipv4: string; image: string }>
> {
  const output = await execa('multipass', ['list', '--format', 'json']);
  return JSON.parse(output.stdout).list;
}

export function stopEndpointHost(hostName: string) {
  if (process.env.CI) {
    return execa('vagrant', ['suspend'], {
      env: {
        VAGRANT_CWD,
        VMNAME: hostName,
      },
    });
  }
  return execa('multipass', ['stop', hostName]);
}

export function startEndpointHost(hostName: string) {
  if (process.env.CI) {
    return execa('vagrant', ['up'], {
      env: {
        VAGRANT_CWD,
      },
    });
  }
  return execa('multipass', ['start', hostName]);
}

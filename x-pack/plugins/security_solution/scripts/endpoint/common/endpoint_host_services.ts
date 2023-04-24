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
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';
import { finished } from 'stream/promises';
import nodeFetch from 'node-fetch';
import {
  fetchAgentPolicyEnrollmentKey,
  fetchFleetServerUrl,
  getAgentDownloadUrl,
  unEnrollFleetAgent,
  waitForHostToEnroll,
} from './fleet_services';
import { SettingsStorage } from './settings_storage';

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
  let cacheCleanupPromise = Promise.resolve();

  const [vm, agentDownload, fleetServerUrl, enrollmentToken] = await Promise.all([
    createMultipassVm({
      vmName: hostname ?? `test-host-${Math.random().toString().substring(2, 6)}`,
      disk,
      cpus,
      memory,
    }),

    getAgentDownloadUrl(version, useClosestVersionMatch, log).then<{
      url: string;
      cache?: DownloadedAgentInfo;
    }>((url) => {
      if (useCache) {
        const agentDownloadClient = new AgentDownloadStorage();

        cacheCleanupPromise = agentDownloadClient.cleanupDownloads();

        return agentDownloadClient.downloadAndStore(url).then((cache) => {
          return {
            url,
            cache,
          };
        });
      }

      return { url };
    }),

    fetchFleetServerUrl(kbnClient),

    fetchAgentPolicyEnrollmentKey(kbnClient, agentPolicyId),
  ]);

  log.verbose(await execa('multipass', ['info', vm.vmName]));

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

  await cacheCleanupPromise;

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

    // mount local folder on VM
    await execa.command(
      `multipass mount ${cachedAgentDownload.directory} ${vmName}:~/_agent_downloads`
    );
    await execa.command(
      `multipass exec ${vmName} -- tar -zxf _agent_downloads/${cachedAgentDownload.filename}`
    );
    await execa.command(`multipass unmount ${vmName}:~/_agent_downloads`);
  } else {
    log.verbose(`downloading and installing agent from URL [${agentDownloadUrl}]`);

    // download into VM
    await execa.command(
      `multipass exec ${vmName} -- curl -L ${agentDownloadUrl} -o ${agentDownloadedFile}`
    );
    await execa.command(`multipass exec ${vmName} -- tar -zxf ${agentDownloadedFile}`);
    await execa.command(`multipass exec ${vmName} -- rm -f ${agentDownloadedFile}`);
  }

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

interface DownloadedAgentInfo {
  filename: string;
  directory: string;
  fullFilePath: string;
}

class AgentDownloadStorage extends SettingsStorage {
  private downloadsFolderExists = false;
  private readonly downloadsDirName = 'agent_download_storage';

  constructor() {
    super('agent_download_storage_settings.json');
  }

  protected async ensureExists(): Promise<void> {
    await super.ensureExists();

    if (!this.downloadsFolderExists) {
      await mkdir(this.buildPath(this.downloadsDirName), { recursive: true });
      this.downloadsFolderExists = true;
    }
  }

  public getPathsForUrl(agentDownloadUrl: string): DownloadedAgentInfo {
    const filename = agentDownloadUrl.replace(/^https?:\/\//gi, '').replace(/\//g, '#');
    const directory = this.buildPath(join(this.downloadsDirName));
    const fullFilePath = this.buildPath(join(this.downloadsDirName, filename));

    return {
      filename,
      directory,
      fullFilePath,
    };
  }

  public async downloadAndStore(agentDownloadUrl: string): Promise<DownloadedAgentInfo> {
    // TODO: should we add "retry" attempts to file downloads?

    await this.ensureExists();

    const newDownloadInfo = this.getPathsForUrl(agentDownloadUrl);

    // If download is already present on disk, then just return that info. No need to re-download it
    if (fs.existsSync(newDownloadInfo.fullFilePath)) {
      return newDownloadInfo;
    }

    try {
      const outputStream = fs.createWriteStream(newDownloadInfo.fullFilePath);
      const { body } = await nodeFetch(agentDownloadUrl);

      await finished(body.pipe(outputStream));
    } catch (e) {
      // Try to clean up download case it failed halfway through
      await unlink(newDownloadInfo.fullFilePath);

      throw e;
    }

    return newDownloadInfo;
  }

  public async cleanupDownloads(): Promise<void> {
    // FIXME:PT implement
    //
    // Read all files from downloads directory
    //
    // delete any `snapshot` downloads that are older than [x] amount of days old
    //
    // Delete any files that is older than [xx] amount of days
  }
}

export const downloadAgent = async (
  agentDownloadUrl: string
): Promise<DownloadedAgentInfo & { url: string }> => {
  const agentDownloadClient = new AgentDownloadStorage();
  const downloadedAgent = await agentDownloadClient.downloadAndStore(agentDownloadUrl);

  return {
    url: agentDownloadUrl,
    ...downloadedAgent,
  };
};

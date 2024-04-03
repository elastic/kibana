/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { prefixedOutputLogger } from './utils';
import type { HostVm } from './types';
import type { BaseVmCreateOptions } from './vm_services';
import { createVm, getHostVmClient } from './vm_services';
import { downloadAndStoreAgent } from './agent_downloads_service';
import { enrollHostVmWithFleet, getAgentDownloadUrl, unEnrollFleetAgent } from './fleet_services';

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
  log: _log,
  agentPolicyId,
  cpus,
  disk,
  memory,
  hostname,
  version = kibanaPackageJson.version,
  useClosestVersionMatch = false,
  useCache = true,
}: CreateAndEnrollEndpointHostOptions): Promise<CreateAndEnrollEndpointHostResponse> => {
  const log = prefixedOutputLogger('createAndEnrollEndpointHost()', _log);
  const isRunningInCI = Boolean(process.env.CI);
  const vmName = hostname ?? `test-host-${Math.random().toString().substring(2, 6)}`;
  const { url: agentUrl } = await getAgentDownloadUrl(version, useClosestVersionMatch, log);
  const agentDownload = isRunningInCI ? await downloadAndStoreAgent(agentUrl) : undefined;

  // TODO: remove dependency on env. var and keep function pure
  const hostVm = process.env.CI
    ? await createVm({
        type: 'vagrant',
        name: vmName,
        log,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        agentDownload: agentDownload!,
        disk,
        cpus,
        memory,
      })
    : await createVm({
        type: 'multipass',
        log,
        name: vmName,
        disk,
        cpus,
        memory,
      });

  const { id: agentId } = await enrollHostVmWithFleet({
    kbnClient,
    log,
    hostVm,
    agentPolicyId,
    version,
    closestVersionMatch: useClosestVersionMatch,
    useAgentCache: useCache,
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
  createdHost: Pick<CreateAndEnrollEndpointHostResponse, 'hostname' | 'agentId'>
): Promise<void> => {
  await Promise.all([
    deleteMultipassVm(createdHost.hostname),
    unEnrollFleetAgent(kbnClient, createdHost.agentId, true),
  ]);
};

export const deleteMultipassVm = async (vmName: string): Promise<void> => {
  await getHostVmClient(vmName).destroy();
};

export async function stopEndpointHost(hostName: string): Promise<void> {
  await getHostVmClient(hostName).stop();
}

export async function startEndpointHost(hostName: string): Promise<void> {
  await getHostVmClient(hostName).start();
}

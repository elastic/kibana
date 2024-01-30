/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';
import type { Client } from '@elastic/elasticsearch';

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test/src/kbn_client';
import { isFleetServerRunning } from '../../../../scripts/endpoint/common/fleet_server/fleet_server_services';
import type { HostVm } from '../../../../scripts/endpoint/common/types';
import type { BaseVmCreateOptions } from '../../../../scripts/endpoint/common/vm_services';
import { createVm } from '../../../../scripts/endpoint/common/vm_services';
import {
  fetchAgentPolicyEnrollmentKey,
  fetchFleetServerUrl,
  getAgentDownloadUrl,
  getAgentFileName,
  getOrCreateDefaultAgentPolicy,
  waitForHostToEnroll,
} from '../../../../scripts/endpoint/common/fleet_services';
import type { DownloadedAgentInfo } from '../../../../scripts/endpoint/common/agent_downloads_service';
import {
  downloadAndStoreAgent,
  isAgentDownloadFromDiskAvailable,
} from '../../../../scripts/endpoint/common/agent_downloads_service';

export interface CreateAndEnrollEndpointHostCIOptions
  extends Pick<BaseVmCreateOptions, 'disk' | 'cpus' | 'memory'> {
  esClient: Client;
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
}

export interface CreateAndEnrollEndpointHostCIResponse {
  hostname: string;
  agentId: string;
  hostVm: HostVm;
}

/**
 * Creates a new virtual machine (host) and enrolls that with Fleet
 */
export const createAndEnrollEndpointHostCI = async ({
  kbnClient,
  esClient,
  log,
  agentPolicyId,
  cpus,
  disk,
  memory,
  hostname,
  version = kibanaPackageJson.version,
  useClosestVersionMatch = true,
}: CreateAndEnrollEndpointHostCIOptions): Promise<CreateAndEnrollEndpointHostCIResponse> => {
  const vmName = hostname ?? `test-host-${Math.random().toString().substring(2, 6)}`;

  const fileNameNoExtension = getAgentFileName(version);
  const agentFileName = `${fileNameNoExtension}.tar.gz`;
  let agentDownload: DownloadedAgentInfo | undefined;

  // Check if agent file is already on disk before downloading it again
  agentDownload = isAgentDownloadFromDiskAvailable(agentFileName);

  // If it has not been already downloaded, it should be downloaded.
  if (!agentDownload) {
    log.warning(
      `There is no agent installer for ${agentFileName} present on disk, trying to download it now.`
    );
    const { url: agentUrl } = await getAgentDownloadUrl(version, useClosestVersionMatch, log);
    agentDownload = await downloadAndStoreAgent(agentUrl, agentFileName);
  }

  const hostVm = await createVm({
    type: 'vagrant',
    name: vmName,
    log,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    agentDownload: agentDownload!,
    disk,
    cpus,
    memory,
  });

  if (!(await isFleetServerRunning(kbnClient))) {
    throw new Error(`Fleet server does not seem to be running on this instance of kibana!`);
  }

  const policyId = agentPolicyId || (await getOrCreateDefaultAgentPolicy({ kbnClient, log })).id;
  const [fleetServerUrl, enrollmentToken] = await Promise.all([
    fetchFleetServerUrl(kbnClient),
    fetchAgentPolicyEnrollmentKey(kbnClient, policyId),
  ]);

  const agentEnrollCommand = [
    'sudo',

    `./${fileNameNoExtension}/elastic-agent`,

    'install',

    '--insecure',

    '--force',

    '--url',
    fleetServerUrl,

    '--enrollment-token',
    enrollmentToken,
  ].join(' ');

  log.info(`Enrolling Elastic Agent with Fleet`);
  log.verbose('Enrollment command:', agentEnrollCommand);

  await hostVm.exec(agentEnrollCommand);

  const { id: agentId } = await waitForHostToEnroll(
    kbnClient,
    log,
    hostVm.name,
    5 * 60 * 1000,
    esClient
  );

  return {
    hostname: hostVm.name,
    agentId,
    hostVm,
  };
};

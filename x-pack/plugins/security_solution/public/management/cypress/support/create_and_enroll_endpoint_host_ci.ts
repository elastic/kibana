/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test/src/kbn_client';
import { kibanaPackageJson } from '@kbn/repo-info';
import { isServerlessKibanaFlavor } from '../../../../common/endpoint/utils/kibana_status';
import { fetchFleetLatestAvailableAgentVersion } from '../../../../common/endpoint/utils/fetch_fleet_version';
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
  /** skip all checks and use provided version */
  forceVersion?: boolean;
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
  forceVersion = false,
}: CreateAndEnrollEndpointHostCIOptions): Promise<CreateAndEnrollEndpointHostCIResponse> => {
  const vmName = hostname ?? `test-host-${Math.random().toString().substring(2, 6)}`;
  let agentVersion = version;

  if (!forceVersion) {
    const isServerless = await isServerlessKibanaFlavor(kbnClient);
    if (isServerless) {
      agentVersion = await fetchFleetLatestAvailableAgentVersion(kbnClient);
    }
  }

  const fileNameNoExtension = getAgentFileName(agentVersion);
  const agentFileName = `${fileNameNoExtension}.tar.gz`;
  let agentDownload: DownloadedAgentInfo | undefined;

  // Check if agent file is already on disk before downloading it again
  agentDownload = isAgentDownloadFromDiskAvailable(agentFileName);

  // If it has not been already downloaded, it should be downloaded.
  if (!agentDownload) {
    log.warning(
      `There is no agent installer for ${agentFileName} present on disk, trying to download it now.`
    );
    const { url: agentUrl } = await getAgentDownloadUrl(agentVersion, useClosestVersionMatch, log);
    log.info(`Downloading agent from ${agentUrl}`);
    agentDownload = await downloadAndStoreAgent(agentUrl, agentFileName);
  } else {
    log.info(`Using agent installer from disk: ${agentDownload.fullFilePath}`);
  }

  log.info(`Creating VM ${vmName}`);
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
  log.info(`VM ${vmName} created`);
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

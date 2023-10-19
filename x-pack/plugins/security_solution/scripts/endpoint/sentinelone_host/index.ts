/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { userInfo } from 'os';
import { ok } from 'assert';
import {
  isFleetServerRunning,
  startFleetServer,
} from '../common/fleet_server/fleet_server_services';
import {
  addSentinelOneIntegrationToAgentPolicy,
  enrollHostVmWithFleet,
  fetchFleetServerUrl,
  getOrCreateDefaultAgentPolicy,
} from '../common/fleet_services';
import { installSentinelOneAgent } from './common';
import { createVm } from '../common/vm_services';
import { createRuntimeServices } from '../common/stack_services';

export const cli = async () => {
  // TODO:PT add support for CPU, Disk and Memory input args

  // TODO:PT is it possible to simplify the argumnets by only requiring that user provide S1 management console URL? and then we get download URL from it?

  return run(runCli, {
    description:
      'Creates a new VM and runs both SentinelOne agent and elastic agent with the SentinelOne integration',
    flags: {
      string: [
        'kibanaUrl',
        'elasticUrl',
        'username',
        'password',
        'version',
        'policy',
        's1AgentUrl',
        's1ApiToken',
        's1SiteToken',
        'vmName',
      ],
      boolean: ['force'],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
        version: '',
        policy: '',
        force: false,
      },
      help: `
      --s1AgentUrl        Required. The URL for the SentinelOne agent
      --s1ApiToken        Required. The API token for SentinelOne
      --s1SiteToken       Required. The Site token for SentinelOne
      --vmName            Optional. The name for the VM
      --version           Optional. The Agent version to be used when installing fleet server.
                          Default: uses the same version as the stack (kibana). Version
                          can also be from 'SNAPSHOT'.
                          Examples: 8.6.0, 8.7.0-SNAPSHOT
      --policy            Optional. The UUID of the agent policy that should be used to enroll
                          the Elastic Agent with Kibana/ES (Default: uses existing (if found) or
                          creates a new one)
      --force             Optional. If true, then fleet-server will be started and connected to
                          kibana even if one seems to already be configured.
      --username          Optional. User name to be used for auth against elasticsearch and
                          kibana (Default: elastic).
      --password          Optional. Password associated with the username (Default: changeme)
      --kibanaUrl         Optional. The url to Kibana (Default: http://127.0.0.1:5601)
      --elasticUrl        Optional. The url to Elasticsearch (Default: http://127.0.0.1:9200)
`,
    },
  });
};

const runCli: RunFn = async ({ log, flags }) => {
  const username = flags.username as string;
  const password = flags.password as string;
  const kibanaUrl = flags.kibanaUrl as string;
  const elasticUrl = flags.elasticUrl as string;
  const version = flags.version as string;
  const s1AgentUrl = flags.s1AgentUrl as string;
  const s1ApiToken = flags.s1ApiToken as string;
  const s1SiteToken = flags.s1SiteToken as string;
  const policy = flags.policy as string;
  const force = flags.force as boolean;

  const getRequiredArgMessage = (argName: string) => `${argName} argument is required`;

  ok(s1AgentUrl, getRequiredArgMessage('s1AgentUrl'));
  ok(s1ApiToken, getRequiredArgMessage('s1ApiToken'));
  ok(s1SiteToken, getRequiredArgMessage('s1SiteToken'));

  const vmName =
    (flags.vmName as string) ||
    `${userInfo().username.toLowerCase().replaceAll('.', '-')}-sentinelone-${Math.random()
      .toString()
      .substring(2, 6)}`;

  // derive the SentinelOne management console URL from the download URL
  const s1ManagementConsoleUri = new URL(s1AgentUrl);
  s1ManagementConsoleUri.pathname = '';
  s1ManagementConsoleUri.hash = '';
  s1ManagementConsoleUri.username = '';
  s1ManagementConsoleUri.pathname = '';
  s1ManagementConsoleUri.search = '';

  const { kbnClient } = await createRuntimeServices({
    kibanaUrl,
    elasticsearchUrl: elasticUrl,
    username,
    password,
    log,
  });

  const hostVm = await createVm({
    type: 'multipass',
    name: vmName,
    log,
    memory: '2G',
    disk: '10G',
  });

  // TODO: can we validate tha the s1 URL + api token is valid?

  const s1Info = await installSentinelOneAgent({
    hostVm,
    log,
    agentUrl: s1AgentUrl,
    apiToken: s1ApiToken,
    siteToken: s1SiteToken,
  });

  if (force) {
    await startFleetServer({ kbnClient, logger: log, version, force });
  } else {
    const currentFleetServerUrl = await fetchFleetServerUrl(kbnClient);

    if (!currentFleetServerUrl || !(await isFleetServerRunning(currentFleetServerUrl))) {
      await startFleetServer({ kbnClient, logger: log, version });
    }
  }

  const agentPolicyId = policy || (await getOrCreateDefaultAgentPolicy({ kbnClient, log })).id;

  await addSentinelOneIntegrationToAgentPolicy({
    kbnClient,
    agentPolicyId,
    consoleUrl: s1ManagementConsoleUri.toString(),
    apiToken: s1ApiToken,
  });

  await enrollHostVmWithFleet({
    hostVm,
    kbnClient,
    log,
    agentPolicyId,
    version,
  });

  log.info(`Done!
${hostVm.info()}

SentinelOne Agent Status:
${s1Info.status}
`);
};

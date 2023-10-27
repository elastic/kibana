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
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import {
  addSentinelOneIntegrationToAgentPolicy,
  getOrCreateDefaultAgentPolicy,
} from '../common/fleet_services';
import { installSentinelOneAgent, S1Client } from './common';
import { createVm } from '../common/vm_services';
import { createRuntimeServices } from '../common/stack_services';

export const cli = async () => {
  // TODO:PT add support for CPU, Disk and Memory input args

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
        's1Url',
        's1ApiToken',
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
      --s1Url             Required. The base URL for SentinelOne management console.
                          Ex: https://usea1-partners.sentinelone.net (valid as of Oct. 2023)
      --s1ApiToken        Required. The API token for SentinelOne
      --vmName            Optional. The name for the VM
      --policy            Optional. The UUID of the Fleet Agent Policy that should be used to setup
                          the SentinelOne Integration
                          Default: re-uses existing dev policy (if found) or creates a new one
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
  const s1Url = flags.s1Url as string;
  const s1ApiToken = flags.s1ApiToken as string;
  const policy = flags.policy as string;

  createToolingLogger.defaultLogLevel = flags.verbose
    ? 'verbose'
    : flags.debug
    ? 'debug'
    : flags.silent
    ? 'silent'
    : flags.quiet
    ? 'error'
    : 'info';

  const getRequiredArgMessage = (argName: string) => `${argName} argument is required`;

  ok(s1Url, getRequiredArgMessage('s1Url'));
  ok(s1ApiToken, getRequiredArgMessage('s1ApiToken'));

  const vmName =
    (flags.vmName as string) ||
    `${userInfo().username.toLowerCase().replaceAll('.', '-')}-sentinelone-${Math.random()
      .toString()
      .substring(2, 6)}`;
  const s1Client = new S1Client({ url: s1Url, apiToken: s1ApiToken, log });
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

  const s1Info = await installSentinelOneAgent({
    hostVm,
    log,
    s1Client,
  });

  const agentPolicyId = policy || (await getOrCreateDefaultAgentPolicy({ kbnClient, log })).id;

  await addSentinelOneIntegrationToAgentPolicy({
    kbnClient,
    log,
    agentPolicyId,
    consoleUrl: s1Url,
    apiToken: s1ApiToken,
  });

  log.info(`Done!

${hostVm.info()}

SentinelOne Agent Status:
${s1Info.status}
`);
};

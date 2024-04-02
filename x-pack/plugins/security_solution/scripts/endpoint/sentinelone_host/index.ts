/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { ok } from 'assert';
import {
  isFleetServerRunning,
  startFleetServer,
} from '../common/fleet_server/fleet_server_services';
import type { HostVm } from '../common/types';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import {
  addSentinelOneIntegrationToAgentPolicy,
  DEFAULT_AGENTLESS_INTEGRATIONS_AGENT_POLICY_NAME,
  enrollHostVmWithFleet,
  fetchAgentPolicy,
  getOrCreateDefaultAgentPolicy,
} from '../common/fleet_services';
import {
  createDetectionEngineSentinelOneRuleIfNeeded,
  createSentinelOneStackConnectorIfNeeded,
  installSentinelOneAgent,
  S1Client,
} from './common';
import {
  createMultipassHostVmClient,
  createVm,
  findVm,
  generateVmName,
  getMultipassVmCountNotice,
} from '../common/vm_services';
import { createKbnClient } from '../common/stack_services';

export const cli = async () => {
  // TODO:PT add support for CPU, Disk and Memory input args

  return run(runCli, {
    description: `Sets up the kibana system so that SentinelOne hosts data can be be streamed to Elasticsearch.
It will first setup a host VM that runs the SentinelOne agent on it. This VM will ensure that data is being
created in SentinelOne.
It will then also setup a second VM (if necessary) that runs Elastic Agent along with the SentinelOne integration
policy (an agent-less integration) - this is the process that then connects to the SentinelOne management
console and pushes the data to Elasticsearch.`,
    flags: {
      string: [
        'kibanaUrl',
        'username',
        'password',
        'version',
        'policy',
        's1Url',
        's1ApiToken',
        'vmName',
      ],
      boolean: ['forceFleetServer', 'forceNewS1Host'],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        username: 'elastic',
        password: 'changeme',
        policy: '',
      },
      help: `
      --s1Url             Required. The base URL for SentinelOne management console.
                          Ex: https://usea1-partners.sentinelone.net (valid as of Oct. 2023)
      --s1ApiToken        Required. The API token for SentinelOne
      --vmName            Optional. The name for the VM.
                          Default: [current login user name]-sentinelone-[unique number]
      --policy            Optional. The UUID of the Fleet Agent Policy that should be used to setup
                          the SentinelOne Integration
                          Default: re-uses existing dev policy (if found) or creates a new one
      --forceFleetServer  Optional. If fleet server should be started/configured even if it seems
                          like it is already setup.
      --forceNewS1Host    Optional. Force a new VM host to be created and enrolled with SentinelOne.
                          By default, a check is done to see if a host running SentinelOne is
                          already running and if so, a new one will not be created - unless this
                          option is used
      --username          Optional. User name to be used for auth against elasticsearch and
                          kibana (Default: elastic).
      --password          Optional. Password associated with the username (Default: changeme)
      --kibanaUrl         Optional. The url to Kibana (Default: http://127.0.0.1:5601)
`,
    },
  });
};

const runCli: RunFn = async ({ log, flags }) => {
  const username = flags.username as string;
  const password = flags.password as string;
  const kibanaUrl = flags.kibanaUrl as string;
  const s1Url = flags.s1Url as string;
  const s1ApiToken = flags.s1ApiToken as string;
  const policy = flags.policy as string;
  const forceFleetServer = flags.forceFleetServer as boolean;
  const forceNewS1Host = flags.forceNewS1Host as boolean;
  const getRequiredArgMessage = (argName: string) => `${argName} argument is required`;

  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  ok(s1Url, getRequiredArgMessage('s1Url'));
  ok(s1ApiToken, getRequiredArgMessage('s1ApiToken'));

  const vmName = (flags.vmName as string) || generateVmName('sentinelone');
  const s1Client = new S1Client({ url: s1Url, apiToken: s1ApiToken, log });
  const kbnClient = createKbnClient({
    log,
    url: kibanaUrl,
    username,
    password,
  });

  const runningS1VMs = (
    await findVm(
      'multipass',
      flags.vmName ? vmName : new RegExp(`^${vmName.substring(0, vmName.lastIndexOf('-'))}`)
    )
  ).data;

  // Avoid enrolling another VM with SentinelOne if we already have one running
  const s1HostVm =
    forceNewS1Host || runningS1VMs.length === 0
      ? await createVm({
          type: 'multipass',
          name: vmName,
          log,
          memory: '2G',
          disk: '10G',
        }).then((vm) => {
          return installSentinelOneAgent({
            hostVm: vm,
            log,
            s1Client,
          }).then((s1Info) => {
            log.info(`SentinelOne Agent Status:\n${s1Info.status}`);

            return vm;
          });
        })
      : await Promise.resolve(createMultipassHostVmClient(runningS1VMs[0], log)).then((vm) => {
          log.info(
            `A host VM running SentinelOne Agent is already running - will reuse it.\nTIP: Use 'forceNewS1Host' to force the creation of a new one if desired`
          );

          return vm;
        });

  const {
    id: agentPolicyId,
    agents = 0,
    name: agentPolicyName,
  } = policy
    ? await fetchAgentPolicy(kbnClient, policy)
    : await getOrCreateDefaultAgentPolicy({
        kbnClient,
        log,
        policyName: DEFAULT_AGENTLESS_INTEGRATIONS_AGENT_POLICY_NAME,
      });

  await addSentinelOneIntegrationToAgentPolicy({
    kbnClient,
    log,
    agentPolicyId,
    consoleUrl: s1Url,
    apiToken: s1ApiToken,
  });

  let agentPolicyVm: HostVm | undefined;

  // If no agents are running against the given Agent policy for agentless integrations, then add one now
  if (!agents) {
    log.info(`Creating VM and enrolling it with Fleet using policy [${agentPolicyName}]`);

    agentPolicyVm = await createVm({
      type: 'multipass',
      name: generateVmName('agentless-integrations'),
    });

    if (forceFleetServer || !(await isFleetServerRunning(kbnClient, log))) {
      await startFleetServer({
        kbnClient,
        logger: log,
        force: forceFleetServer,
      });
    }

    await enrollHostVmWithFleet({
      hostVm: agentPolicyVm,
      kbnClient,
      log,
      agentPolicyId,
    });
  } else {
    log.debug(
      `No host VM created for Fleet agent policy [${agentPolicyName}]. It already shows to have [${agents}] enrolled`
    );
  }

  await Promise.all([
    createSentinelOneStackConnectorIfNeeded({ kbnClient, log, s1ApiToken, s1Url }),
    createDetectionEngineSentinelOneRuleIfNeeded(kbnClient, log),
  ]);

  // Trigger an alert on the SentinelOn host so that we get an alert back in Kibana
  await s1HostVm.exec('nslookup elastic.co');

  log.info(`Done!

${s1HostVm.info()}
${agentPolicyVm ? `${agentPolicyVm.info()}\n` : ''}
${await getMultipassVmCountNotice(2)}
`);
};

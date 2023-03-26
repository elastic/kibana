/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { userInfo } from 'os';
import { run } from '@kbn/dev-cli-runner';
import execa from 'execa';
import { isEmpty } from 'lodash';
import type { CreatePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_API_ROUTES } from '@kbn/fleet-plugin/common';
import { getPackageInfo } from '../../../common/endpoint/index_data';
import { downloadAndUnpackAgent, enrollElasticAgent } from './elastic_endpoint';
import { getRuntimeServices, startRuntimeServices } from './runtime';
import { checkDependencies } from './pre_check';
import { runFleetServerIfNeeded } from './fleet_server';

export const runMultipass = async (
  vmName: string,
  vmDirName: string,
  params: string[],
  sync: boolean = false,
  options: execa.Options = {}
) => {
  const { log } = getRuntimeServices();

  const execBaseParams = [
    'exec',
    vmName,
    '--working-directory',
    `/home/ubuntu/${vmDirName}`,
    '--',
    'sudo',
  ];

  log.debug(`Running: multipass ${[...execBaseParams, ...params].join(' ')}`);

  if (sync) {
    execa.sync('multipass', [...execBaseParams, ...params], {
      shell: true,
      ...options,
    } as execa.SyncOptions);
    return;
  }

  return execa.command(['multipass', ...execBaseParams, ...params].join(' '), {
    stdio: 'inherit',
    ...options,
  });
};

export const runBeatCommand = async (
  vmName: string,
  vmDirName: string,
  beatName: string,
  params: string[],
  detached: boolean = false
) => {
  // TODO: rewrite to use yq
  const envParams = [
    '-E',
    `"output.elasticsearch.hosts=['http://192.168.1.15:9220']"`,
    '-E',
    'output.elasticsearch.username=elastic',
    '-E',
    'output.elasticsearch.password=changeme',
    '-E',
    `"setup.kibana.host='http://192.168.1.15:5601'"`,
    detached ? `\&>/dev/null \&` : '-e',
  ];

  return runMultipass(vmName, vmDirName, [`./${beatName}`, ...params, ...envParams], detached);
};

export const runAuditbeat = async (vmName: string) => {
  const dirName = await downloadAndUnpackAgent(vmName, 'auditbeat');

  await runBeatCommand(vmName, dirName, 'auditbeat', ['setup']);

  // socket module is not supported on arm64
  if (process.arch === 'arm64') {
    const socketDatasetPath = `.\\"auditbeat.modules\\"[].datasets[] | select(contains(\\"socket\\"))`;
    const socketDatasetExists = (
      await runMultipass(
        vmName,
        dirName,
        [`yq '${socketDatasetPath} | path | .[-1]' auditbeat.yml`],
        false,
        { stdio: 'pipe' }
      )
    )?.stdout;

    if (socketDatasetExists) {
      await runMultipass(vmName, dirName, [`yq -i 'del(${socketDatasetPath})' auditbeat.yml`]);
    }
  }

  await runBeatCommand(vmName, dirName, 'auditbeat', [], true);
};

export const runSuricata = async (vmName: string) => {
  await runMultipass(vmName, '', [`systemctl start suricata.service`]);
};

export const runFilebeat = async (vmName: string): Promise<string> => {
  const vmDirName = await downloadAndUnpackAgent(vmName, 'filebeat');

  await runBeatCommand(vmName, vmDirName, 'filebeat', ['setup']);

  await runBeatCommand(vmName, vmDirName, 'filebeat', ['modules', 'enable', 'system']);
  await runBeatCommand(vmName, vmDirName, 'filebeat', ['modules', 'enable', 'suricata']);
  await runMultipass(vmName, vmDirName, [
    `yq -i '.[0].syslog.enabled |= true' modules.d/system.yml`,
  ]);
  await runMultipass(vmName, vmDirName, [`yq -i '.[0].auth.enabled |= true' modules.d/system.yml`]);
  await runMultipass(vmName, vmDirName, [
    `yq -i '.[0].eve.enabled |= true' modules.d/suricata.yml`,
  ]);

  await runBeatCommand(vmName, vmDirName, 'filebeat', [], true);

  return vmDirName;
};

export const runPacketbeat = async (vmName: string) => {
  const dirName = await downloadAndUnpackAgent(vmName, 'packetbeat');

  await runBeatCommand(vmName, dirName, 'packetbeat', ['setup']);
  await runBeatCommand(
    vmName,
    dirName,
    'packetbeat',
    ['-E', `"packetbeat.interfaces.type=af_packet"`, '-E', `"packetbeat.interfaces.device=any"`],
    true
  );
};

export const addIntegration = async (
  vmName: string,
  agentPolicyId: string,
  integrationName: string,
  integrationVersion?: string
) => {
  const { log, kbnClient } = getRuntimeServices();

  try {
    const packageVersion =
      integrationVersion ?? (await getPackageInfo(kbnClient, integrationName)).version;

    await kbnClient.request<CreatePackagePolicyResponse>({
      path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
      method: 'POST',
      body: {
        policy_id: agentPolicyId,
        package: {
          name: integrationName,
          version: packageVersion,
        },
        name: `${integrationName}_${vmName}`,
      },
    });
  } catch (e) {
    log.error(e.response?.data?.message ?? e);
  }
};

export const launchMultipassVM = async () => {
  const { log } = getRuntimeServices();

  const uniqueId = Math.random().toString().substring(2, 6);
  const username = userInfo().username.toLowerCase();

  const vmName = `${username}-dev-${uniqueId}`;

  log.info(__dirname);

  log.info(resolve('./full_endpoint_cloud_init.yaml'));

  await execa.command(
    `multipass launch --name ${vmName} --disk 10G --cpus 2 --memory 2G --cloud-init ${`${__dirname}/full_endpoint_cloud_init.yaml`}`,
    { stdio: 'inherit' }
  );

  log.verbose(await execa('multipass', ['info', vmName]));

  return vmName;
};

export const setupDetectionRules = async (vmName: string) => {
  await runMultipass(vmName, 'detection-rules', [`sudo -u ubuntu bash -i -c "make"`]);
};

export const cli = () =>
  run(
    async (cliContext) => {
      const username = cliContext.flags.username as string;
      const password = cliContext.flags.password as string;
      const kibanaUrl = cliContext.flags.kibanaUrl as string;
      const elasticUrl = cliContext.flags.elasticUrl as string;
      const version = cliContext.flags.version as string;
      const policy = cliContext.flags.policy as string;
      const log = cliContext.log;

      await startRuntimeServices({
        elasticUrl,
        kibanaUrl,
        username,
        password,
        version,
        policy,
        log,
      });

      await checkDependencies();

      await runFleetServerIfNeeded();

      const vmName = !isEmpty(cliContext.flags.vmName)
        ? (cliContext.flags.vmName as string)
        : await launchMultipassVM();

      await setupDetectionRules(vmName);

      const { policyId } = await enrollElasticAgent(vmName);

      await addIntegration(vmName, policyId, 'suricata');
      await addIntegration(vmName, policyId, 'ti_util');
      await addIntegration(vmName, policyId, 'ti_abusech');

      await runAuditbeat(vmName);
      await runPacketbeat(vmName);
      await runFilebeat(vmName);

      await runSuricata(vmName);
    },
    {
      description: `
        Enrolls a new host running Elastic Agent with Fleet. It will (if necessary) first create a
        Fleet Server instance using Docker, and then it will initialize a new Ubuntu VM using
        'multipass', install Elastic Agent and enroll it with Fleet. Can be used multiple times
        against the same stack.`,
      flags: {
        string: ['kibana', 'elastic', 'username', 'password', 'version', 'policy'],
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          version: '',
          policy: '',
          vmName: '',
        },
        help: `
          --version           Optional. The version of the Agent to use for enrolling the new host.
                              Default: uses the same version as the stack (kibana). Version
                              can also be from 'SNAPSHOT'.
                              Examples: 8.6.0, 8.7.0-SNAPSHOT
          --policy            Optional. An Agent Policy ID to use when enrolling the new Host
                              running Elastic Agent.
          --username          Optional. User name to be used for auth against elasticsearch and
                              kibana (Default: elastic).
          --password          Optional. Password associated with the username (Default: changeme)
          --kibanaUrl         Optional. The url to Kibana (Default: http://127.0.0.1:5601)
          --elasticUrl        Optional. The url to Elasticsearch (Default: http://127.0.0.1:9200)
          --vmName            Optional. The name of the VM to use for enrolling the new host
        `,
      },
    }
  );

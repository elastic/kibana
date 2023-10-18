/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';

interface InstallSentinelOneAgentOptions {
  hostVm: HostVm;
  agentUrl: string;
  apiToken: string;
  siteToken: string;
  log?: ToolingLog;
}

interface InstallSentinelOneAgentResponse {
  path: string;
  status: string;
}

export const installSentinelOneAgent = async ({
  hostVm,
  agentUrl,
  apiToken,
  siteToken,
  // FIXME:PT use `createToolingLogger()` when that is available
  log = new ToolingLog({ level: 'info', writeTo: process.stdout }),
}: InstallSentinelOneAgentOptions): Promise<InstallSentinelOneAgentResponse> => {
  log.info(`Installing SentinelOne agent to VM [${hostVm.name}]`);

  const installPath = '/opt/sentinelone/bin/sentinelctl';

  return log.indent(4, async () => {
    log.info(`Downloading SentinelOne agent`);
    await hostVm.exec(`curl ${agentUrl}?APIToken=${apiToken} -o sentinel.deb`);

    log.info(`Installing agent and starting service`);
    await hostVm.exec(`sudo dpkg -i sentinel.deb`);
    await hostVm.exec(`sudo ${installPath} management token set ${siteToken}`);
    await hostVm.exec(`sudo ${installPath} control start`);

    const status = (await hostVm.exec(`sudo ${installPath} control status`)).stdout;

    log.info('done');
    return {
      path: installPath,
      status,
    };
  });
};

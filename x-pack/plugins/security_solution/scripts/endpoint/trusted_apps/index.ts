/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import minimist from 'minimist';
import { ToolingLog } from '@kbn/dev-utils';
import { KbnClient } from '@kbn/test';
import bluebird from 'bluebird';
import { basename } from 'path';
import { TRUSTED_APPS_CREATE_API, TRUSTED_APPS_LIST_API } from '../../../common/endpoint/constants';
import { NewTrustedApp, OperatingSystem, TrustedApp } from '../../../common/endpoint/types';

const defaultLogger = new ToolingLog({ level: 'info', writeTo: process.stdout });
const separator = '----------------------------------------';

export const cli = async () => {
  const cliDefaults = {
    string: ['kibana'],
    default: {
      count: 10,
      kibana: 'http://elastic:changeme@localhost:5601',
    },
  };
  const options: RunOptions = minimist<RunOptions>(process.argv.slice(2), cliDefaults);

  if ('help' in options) {
    defaultLogger.write(`
node ${basename(process.argv[1])} [options]

Options:${Object.keys(cliDefaults.default).reduce((out, option) => {
      // @ts-ignore
      return `${out}\n  --${option}=${cliDefaults.default[option]}`;
    }, '')}
`);
    return;
  }

  const runLogger = createRunLogger();

  defaultLogger.write(`${separator}
Loading ${options.count} Trusted App Entries`);
  await run({
    ...options,
    logger: runLogger,
  });
  defaultLogger.write(`
Done!
${separator}`);
};

interface RunOptions {
  count?: number;
  kibana?: string;
  logger?: ToolingLog;
}
export const run: (options?: RunOptions) => Promise<TrustedApp[]> = async ({
  count = 10,
  kibana = 'http://elastic:changeme@localhost:5601',
  logger = defaultLogger,
}: RunOptions = {}) => {
  const kbnClient = new KbnClient({
    log: logger,
    url: kibana,
  });

  // touch the Trusted Apps List so it can be created
  await kbnClient.request({
    method: 'GET',
    path: TRUSTED_APPS_LIST_API,
  });

  return bluebird.map(
    Array.from({ length: count }),
    () =>
      kbnClient
        .request<TrustedApp>({
          method: 'POST',
          path: TRUSTED_APPS_CREATE_API,
          body: generateTrustedAppEntry(),
        })
        .then(({ data }) => {
          logger.write(data.id);
          return data;
        }),
    { concurrency: 10 }
  );
};

interface GenerateTrustedAppEntryOptions {
  os?: OperatingSystem;
  name?: string;
}
const generateTrustedAppEntry: (options?: GenerateTrustedAppEntryOptions) => object = ({
  os = randomOperatingSystem(),
  name = randomName(),
} = {}): NewTrustedApp => {
  const newTrustedApp: NewTrustedApp = {
    description: `Generator says we trust ${name}`,
    name,
    os,
    effectScope: {
      type: 'global',
    },
    entries: [
      {
        // @ts-ignore
        field: 'process.hash.*',
        operator: 'included',
        type: 'match',
        value: '1234234659af249ddf3e40864e9fb241',
      },
      {
        // @ts-ignore
        field: 'process.executable.caseless',
        operator: 'included',
        type: 'match',
        value: '/one/two/three',
      },
    ],
  };

  return newTrustedApp;
};

const randomN = (max: number): number => Math.floor(Math.random() * max);

const randomName = (() => {
  const names = [
    'Symantec Endpoint Security',
    'Bitdefender GravityZone',
    'Malwarebytes',
    'Sophos Intercept X',
    'Webroot Business Endpoint Protection',
    'ESET Endpoint Security',
    'FortiClient',
    'Kaspersky Endpoint Security',
    'Trend Micro Apex One',
    'CylancePROTECT',
    'VIPRE',
    'Norton',
    'McAfee Endpoint Security',
    'AVG AntiVirus',
    'CrowdStrike Falcon',
    'Avast Business Antivirus',
    'Avira Antivirus',
    'Cisco AMP for Endpoints',
    'Eset Endpoint Antivirus',
    'VMware Carbon Black',
    'Palo Alto Networks Traps',
    'Trend Micro',
    'SentinelOne',
    'Panda Security for Desktops',
    'Microsoft Defender ATP',
  ];
  const count = names.length;

  return () => names[randomN(count)];
})();

const randomOperatingSystem = (() => {
  const osKeys = Object.keys(OperatingSystem) as Array<keyof typeof OperatingSystem>;
  const count = osKeys.length;

  return () => OperatingSystem[osKeys[randomN(count)]];
})();

const createRunLogger = () => {
  let groupCount = 1;
  let itemCount = 0;

  return new ToolingLog({
    level: 'info',
    writeTo: {
      write: (msg: string) => {
        process.stdout.write('.');
        itemCount++;

        if (itemCount === 5) {
          itemCount = 0;

          if (groupCount === 5) {
            process.stdout.write('\n');
            groupCount = 1;
          } else {
            process.stdout.write('  ');
            groupCount++;
          }
        }
      },
    },
  });
};

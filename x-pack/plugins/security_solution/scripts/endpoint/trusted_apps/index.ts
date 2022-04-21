/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import minimist from 'minimist';
import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';
import pMap from 'p-map';
import { basename } from 'path';
import {
  ENDPOINT_TRUSTED_APPS_LIST_DESCRIPTION,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_NAME,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { CreateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { TrustedApp } from '../../../common/endpoint/types';
import { TrustedAppGenerator } from '../../../common/endpoint/data_generators/trusted_app_generator';

import { newTrustedAppToCreateExceptionListItem } from '../../../public/management/pages/trusted_apps/service/mappers';
import { randomPolicyIdGenerator } from '../common/random_policy_id_generator';

const defaultLogger = new ToolingLog({ level: 'info', writeTo: process.stdout });
const separator = '----------------------------------------';
const trustedAppGenerator = new TrustedAppGenerator();

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
      // @ts-expect-error TS7053
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

  // setup fleet with endpoint integrations
  // and
  // and ensure the trusted apps list is created
  logger.info('setting up Fleet with endpoint and creating trusted apps list');
  ensureCreateEndpointTrustedAppsList(kbnClient);

  const randomPolicyId = await randomPolicyIdGenerator(kbnClient, logger);

  return pMap(
    Array.from({ length: count }),
    async () => {
      const body = trustedAppGenerator.generateTrustedAppForCreate();

      if (body.effectScope.type === 'policy') {
        body.effectScope.policies = [randomPolicyId(), randomPolicyId()];
      }

      return kbnClient
        .request<TrustedApp>({
          method: 'POST',
          path: EXCEPTION_LIST_ITEM_URL,
          body: newTrustedAppToCreateExceptionListItem(body),
        })
        .then(({ data }) => {
          logger.write(data.id);
          return data;
        });
    },
    { concurrency: 10 }
  );
};

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

const ensureCreateEndpointTrustedAppsList = async (kbn: KbnClient) => {
  const newListDefinition: CreateExceptionListSchema = {
    description: ENDPOINT_TRUSTED_APPS_LIST_DESCRIPTION,
    list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
    meta: undefined,
    name: ENDPOINT_TRUSTED_APPS_LIST_NAME,
    os_types: [],
    tags: [],
    type: 'endpoint',
    namespace_type: 'agnostic',
  };

  await kbn
    .request({
      method: 'POST',
      path: EXCEPTION_LIST_URL,
      body: newListDefinition,
    })
    .catch((e) => {
      // Ignore if list was already created
      if (e.response.status !== 409) {
        throw e;
      }
    });
};

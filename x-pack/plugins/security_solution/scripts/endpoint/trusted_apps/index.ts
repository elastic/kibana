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
import { AxiosResponse } from 'axios';
import { TRUSTED_APPS_CREATE_API, TRUSTED_APPS_LIST_API } from '../../../common/endpoint/constants';
import { TrustedApp } from '../../../common/endpoint/types';
import { TrustedAppGenerator } from '../../../common/endpoint/data_generators/trusted_app_generator';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { setupFleetForEndpoint } from '../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { GetPolicyListResponse } from '../../../public/management/pages/policy/types';
import {
  PACKAGE_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../fleet/common';

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

  // touch the Trusted Apps List so it can be created
  // and
  // setup fleet with endpoint integrations
  logger.info('setting up Fleet with endpoint and creating trusted apps list');
  const [installedEndpointPackage] = await Promise.all([
    setupFleetForEndpoint(kbnClient).then((response) => response.endpointPackage),

    kbnClient.request({
      method: 'GET',
      path: TRUSTED_APPS_LIST_API,
    }),
  ]);

  // Setup a list of real endpoint policies and return a method to randomly select one
  const randomPolicyId: () => string = await (async () => {
    const randomN = (max: number): number => Math.floor(Math.random() * max);
    const policyIds: string[] =
      (await fetchEndpointPolicies(kbnClient)).data.items.map((policy) => policy.id) || [];

    // If the number of existing policies is less than 5, then create some more policies
    if (policyIds.length < 5) {
      for (let i = 0, t = 5 - policyIds.length; i < t; i++) {
        policyIds.push(
          (
            await indexFleetEndpointPolicy(
              kbnClient,
              `Policy for Trusted App assignment ${i + 1}`,
              installedEndpointPackage.version
            )
          ).integrationPolicies[0].id
        );
      }
    }

    return () => policyIds[randomN(policyIds.length)];
  })();

  return bluebird.map(
    Array.from({ length: count }),
    async () => {
      const body = trustedAppGenerator.generateTrustedAppForCreate();

      if (body.effectScope.type === 'policy') {
        body.effectScope.policies = [randomPolicyId(), randomPolicyId()];
      }

      return kbnClient
        .request<TrustedApp>({
          method: 'POST',
          path: TRUSTED_APPS_CREATE_API,
          body,
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

const fetchEndpointPolicies = (
  kbnClient: KbnClient
): Promise<AxiosResponse<GetPolicyListResponse>> => {
  return kbnClient.request<GetPolicyListResponse>({
    method: 'GET',
    path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
    query: {
      perPage: 100,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
    },
  });
};

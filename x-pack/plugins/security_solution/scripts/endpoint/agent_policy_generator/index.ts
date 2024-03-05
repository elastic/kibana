/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { createKbnClient } from '../common/stack_services';
import { createAgentPolicy } from '../common/fleet_services';

export const cli = () => {
  run(
    async (options) => {
      try {
        const totalCount = options.flags.count;
        const startTime = new Date().getTime();
        options.log.success(`Creating ${totalCount} agent policies`);
        await agentPolicyGenerator(options);
        options.log.success(`${totalCount} agent policies created`);
        const endTime = new Date().getTime();
        options.log.info(`Generating ${totalCount} agent policies took ${endTime - startTime}ms`);
      } catch (e) {
        options.log.error(e);
        throw createFailError(e.message);
      }
    },
    {
      description: 'Load Agent Policies',
      flags: {
        string: ['kibana'],
        default: {
          count: 10,
          concurrency: 10,
          kibana: 'http://127.0.0.1:5601',
          username: 'elastic',
          password: 'changeme',
        },
        help: `
        --count               Number of agent policies to create. Default: 10
        --concurrency         Number of concurrent agent policies can be created. Default: 10
        --kibana              The URL to kibana including credentials. Default: http://127.0.0.1:5601
        --username            The username to use for authentication. Default: elastic
        --password            The password to use for authentication. Default: changeme
      `,
      },
    }
  );
};

const agentPolicyGenerator: RunFn = async ({ flags, log }) => {
  const kbnClient = createKbnClient({
    url: flags.kibana as string,
    username: flags.username as string,
    password: flags.password as string,
  });

  const totalPoliciesCount = flags.count as unknown as number;
  let newPoliciesCount = 0;
  await pMap(
    Array.from({ length: totalPoliciesCount }),
    () => {
      if (newPoliciesCount !== 0 && newPoliciesCount % 10 === 0) {
        log.info(
          `Created ${newPoliciesCount} agent policies of ${totalPoliciesCount}. Generating ${
            totalPoliciesCount - newPoliciesCount
          } more...`
        );
      }
      newPoliciesCount++;
      return createAgentPolicy({ kbnClient });
    },
    { concurrency: flags.concurrency as unknown as number }
  );
};

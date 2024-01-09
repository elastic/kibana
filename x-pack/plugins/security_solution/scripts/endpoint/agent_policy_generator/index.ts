/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import pMap from 'p-map';
import { KbnClient } from '@kbn/test';
import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';

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
          kibana: 'http://elastic:changeme@127.0.0.1:5601',
        },
        help: `
        --count               Number of agent policies to create. Default: 10
        --concurrency         Number of concurrent agent policies can be created. Default: 10
        --kibana              The URL to kibana including credentials. Default: http://elastic:changeme@127.0.0.1:5601
      `,
      },
    }
  );
};

const agentPolicyGenerator: RunFn = async ({ flags, log }) => {
  const kbn = new KbnClient({ log, url: flags.kibana as string });

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
      return kbn.request({
        method: 'POST',
        path: '/api/fleet/agent_policies',
        body: {
          name: uuidv4(),
          description: '',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          inactivity_timeout: 1209600,
          is_protected: false,
        },
      });
    },
    { concurrency: flags.concurrency as unknown as number }
  );
};

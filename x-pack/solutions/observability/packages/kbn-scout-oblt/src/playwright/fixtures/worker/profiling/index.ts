/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreWorkerFixtures } from '@kbn/scout/src/playwright/fixtures/scope/worker';
import supertest from 'supertest';
import type request from 'superagent';
import { format as formatUrl } from 'url';
import type { ProfilingUsername } from './create_profiling_users/authentication';
import { PROFILING_TEST_PASSWORD } from './create_profiling_users/authentication';
import { createProfilingApiClient } from './api_supertest';

export interface ProfilingClientFixture {
  adminUser(options: {
    endpoint: string;
    params?: { query?: any; path?: any };
  }): Promise<request.Response>;
}
export const profilingClientFixture = coreWorkerFixtures.extend<
  {},
  { profilingClient: ProfilingClientFixture }
>({
  profilingClient: [
    async ({ config, log }, use) => {
      const kibanaServer = config.metadata.config.servers.kibana;
      function getProfilingApiClient({ username }: { username: ProfilingUsername | 'elastic' }) {
        const url = formatUrl({
          ...kibanaServer,
          auth: `${username}:${PROFILING_TEST_PASSWORD}`,
        });
        console.log('URL: ' + url);
        return createProfilingApiClient(supertest(url));
      }
      await use({
        adminUser: getProfilingApiClient({ username: 'elastic' }),
      });
    },
    { scope: 'worker' },
  ],
});

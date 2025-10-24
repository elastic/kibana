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
import { ProfilingUsername } from './create_profiling_users/authentication';
import { PROFILING_TEST_PASSWORD } from './create_profiling_users/authentication';
import { createProfilingApiClient } from './api_supertest';
export interface ProfilingClientFixture {
  adminUser(options: {
    endpoint: string;
    params?: { query?: any; path?: any };
  }): Promise<request.Response>;
  viewerUser(options: {
    endpoint: string;
    params?: { query?: any; path?: any };
  }): Promise<request.Response>;
  NoAccessUser(options: {
    endpoint: string;
    params?: { query?: any; path?: any };
  }): Promise<request.Response>;
}
export const profilingClientFixture = coreWorkerFixtures.extend<
  {},
  { profilingClient: ProfilingClientFixture }
>({
  profilingClient: [
    async ({ config, kbnClient, log, esClient }, use) => {
      log.info('Setting up profiling users for profilingClientFixture');

      await Promise.all([
        esClient.security.putUser({
          username: 'viewer',
          password: 'changeme',
          roles: ['viewer'],
        }),
        esClient.security.putUser({
          username: 'no_access_user',
          password: 'changeme',
          roles: [],
        }),
      ]);

      const kibanaServer = new URL(config.hosts.kibana);

      function getProfilingApiClient({ username }: { username: ProfilingUsername | 'elastic' }) {
        kibanaServer.username = username;
        kibanaServer.password =
          username === 'elastic' ? config.auth.password : PROFILING_TEST_PASSWORD;
        const url = formatUrl(kibanaServer);
        return createProfilingApiClient(supertest(url));
      }
      await use({
        adminUser: getProfilingApiClient({ username: 'elastic' }),
        viewerUser: getProfilingApiClient({ username: ProfilingUsername.viewerUser }),
        NoAccessUser: getProfilingApiClient({ username: ProfilingUsername.noAccessUser }),
      });
    },
    { scope: 'worker' },
  ],
});

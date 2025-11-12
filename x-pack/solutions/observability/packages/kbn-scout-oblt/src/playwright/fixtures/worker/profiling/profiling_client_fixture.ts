/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreWorkerFixtures } from '@kbn/scout/src/playwright/fixtures/scope/worker';
import type request from 'superagent';
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
    async ({ config, log, esClient }, use) => {
      log.info('Setting up profiling users for profilingClientFixture');

      await Promise.all([
        esClient.security.putUser({
          username: 'viewer',
          password: PROFILING_TEST_PASSWORD,
          roles: ['viewer'],
        }),
        esClient.security.putUser({
          username: 'no_access_user',
          password: PROFILING_TEST_PASSWORD,
          roles: [],
        }),
      ]);

      function getProfilingApiClient({ username }: { username: ProfilingUsername | 'elastic' }) {
        const url = new URL(config.hosts.kibana);
        url.username = username;
        url.password = username === 'elastic' ? config.auth.password : PROFILING_TEST_PASSWORD;
        return createProfilingApiClient(url);
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

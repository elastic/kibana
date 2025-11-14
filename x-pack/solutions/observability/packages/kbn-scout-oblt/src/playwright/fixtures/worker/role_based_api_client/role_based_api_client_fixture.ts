/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreWorkerFixtures } from '@kbn/scout/src/playwright/fixtures/scope/worker';
import type request from 'superagent';
import { RoleBasedUsername } from './create_users/authentication';
import { USER_TEST_PASSWORD } from './create_users/authentication';
import { createApiClient } from './api_client';

export interface RoleBasedApiClientFixture {
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
export const roleBasedApiClientFixture = coreWorkerFixtures.extend<
  {},
  { roleBasedApiClient: RoleBasedApiClientFixture }
>({
  roleBasedApiClient: [
    async ({ config, log, esClient }, use) => {
      log.info('Setting up profiling users for profilingClientFixture');

      await Promise.all([
        esClient.security.putUser({
          username: 'viewer',
          password: USER_TEST_PASSWORD,
          roles: ['viewer'],
        }),
        esClient.security.putUser({
          username: 'no_access_user',
          password: USER_TEST_PASSWORD,
          roles: [],
        }),
      ]);

      function getRoleBasedApiClient({ username }: { username: RoleBasedUsername | 'elastic' }) {
        const url = new URL(config.hosts.kibana);
        url.username = username;
        url.password = username === 'elastic' ? config.auth.password : USER_TEST_PASSWORD;
        return createApiClient(url);
      }
      await use({
        adminUser: getRoleBasedApiClient({ username: 'elastic' }),
        viewerUser: getRoleBasedApiClient({ username: RoleBasedUsername.viewerUser }),
        NoAccessUser: getRoleBasedApiClient({ username: RoleBasedUsername.noAccessUser }),
      });
    },
    { scope: 'worker' },
  ],
});

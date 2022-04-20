/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adminTestUser } from '@kbn/test';

import * as kbnTestServer from '@kbn/core/test_helpers/kbn_server';
import type { HttpMethod } from '@kbn/core/test_helpers/kbn_server';

type Root = ReturnType<typeof kbnTestServer.createRoot>;

export * from './docker_registry_helper';

export const waitForFleetSetup = async (root: Root) => {
  const isFleetSetupRunning = async () => {
    const statusApi = getSupertestWithAdminUser(root, 'get', '/api/status');
    const resp = await statusApi.send();
    const fleetStatus = resp.body?.status?.plugins?.fleet;
    if (fleetStatus?.meta?.error) {
      throw new Error(`Setup failed: ${JSON.stringify(fleetStatus)}`);
    }

    return !fleetStatus || fleetStatus?.summary === 'Fleet is setting up';
  };

  while (await isFleetSetupRunning()) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
};

export function getSupertestWithAdminUser(root: Root, method: HttpMethod, path: string) {
  const testUserCredentials = Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`);
  return kbnTestServer
    .getSupertest(root, method, path)
    .set('Authorization', `Basic ${testUserCredentials.toString('base64')}`);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Request } from '@hapi/hapi';

import { KibanaRequest } from '../../../../../../src/core/server';
import type { SavedObjectsClientContract } from '../../../../../../src/core/server';
import { FleetAdminUserInvalidError, isESClientError } from '../../errors';
import { appContextService } from '../app_context';
import { outputService } from '../output';

export async function createAPIKey(
  soClient: SavedObjectsClientContract,
  name: string,
  roleDescriptors: any
) {
  const adminUser = await outputService.getAdminUser(soClient);
  if (!adminUser) {
    throw new Error('No admin user configured');
  }
  const request = KibanaRequest.from(({
    path: '/',
    route: { settings: {} },
    url: { href: '/' },
    raw: { req: { url: '/' } },
    headers: {
      authorization: `Basic ${Buffer.from(`${adminUser.username}:${adminUser.password}`).toString(
        'base64'
      )}`,
    },
  } as unknown) as Request);
  const security = appContextService.getSecurity();
  if (!security) {
    throw new Error('Missing security plugin');
  }

  try {
    const key = await security.authc.apiKeys.create(request, {
      name,
      role_descriptors: roleDescriptors,
    });

    return key;
  } catch (err) {
    if (isESClientError(err) && err.statusCode === 401) {
      // Clear Fleet admin user cache as the user is probably not valid anymore
      outputService.invalidateCache();
      throw new FleetAdminUserInvalidError(`Fleet Admin user is invalid: ${err.message}`);
    }

    throw err;
  }
}

export async function invalidateAPIKeys(soClient: SavedObjectsClientContract, ids: string[]) {
  const adminUser = await outputService.getAdminUser(soClient);
  if (!adminUser) {
    throw new Error('No admin user configured');
  }
  const request = KibanaRequest.from(({
    path: '/',
    route: { settings: {} },
    url: { href: '/' },
    raw: { req: { url: '/' } },
    headers: {
      authorization: `Basic ${Buffer.from(`${adminUser.username}:${adminUser.password}`).toString(
        'base64'
      )}`,
    },
  } as unknown) as Request);

  const security = appContextService.getSecurity();
  if (!security) {
    throw new Error('Missing security plugin');
  }

  try {
    const res = await security.authc.apiKeys.invalidate(request, {
      ids,
    });

    return res;
  } catch (err) {
    if (isESClientError(err) && err.statusCode === 401) {
      // Clear Fleet admin user cache as the user is probably not valid anymore
      outputService.invalidateCache();
      throw new FleetAdminUserInvalidError(`Fleet Admin user is invalid: ${err.message}`);
    }

    throw err;
  }
}

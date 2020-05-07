/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, FakeRequest, SavedObjectsClientContract } from 'src/core/server';
import { CallESAsCurrentUser } from '../../types';
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
  const request: FakeRequest = {
    headers: {
      authorization: `Basic ${Buffer.from(`${adminUser.username}:${adminUser.password}`).toString(
        'base64'
      )}`,
    },
  };
  const security = appContextService.getSecurity();
  if (!security) {
    throw new Error('Missing security plugin');
  }

  return security.authc.createAPIKey(request as KibanaRequest, {
    name,
    role_descriptors: roleDescriptors,
  });
}
export async function authenticate(callCluster: CallESAsCurrentUser) {
  try {
    await callCluster('transport.request', {
      path: '/_security/_authenticate',
      method: 'GET',
    });
  } catch (e) {
    throw new Error('ApiKey is not valid: impossible to authenticate user');
  }
}

export async function invalidateAPIKey(soClient: SavedObjectsClientContract, id: string) {
  const adminUser = await outputService.getAdminUser(soClient);
  if (!adminUser) {
    throw new Error('No admin user configured');
  }
  const request: FakeRequest = {
    headers: {
      authorization: `Basic ${Buffer.from(`${adminUser.username}:${adminUser.password}`).toString(
        'base64'
      )}`,
    },
  };

  const security = appContextService.getSecurity();
  if (!security) {
    throw new Error('Missing security plugin');
  }

  return security.authc.invalidateAPIKey(request as KibanaRequest, {
    id,
  });
}

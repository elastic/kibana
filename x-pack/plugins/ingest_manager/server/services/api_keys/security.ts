/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, FakeRequest } from 'kibana/server';
import { appContextService } from '../app_context';
import { outputService } from '../output';

export async function createAPIKey(name: string, roleDescriptors: any) {
  const adminUser = await outputService.getAdminUser();
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
export async function authenticate(headers: any) {
  const clusterClient = appContextService.getClusterClient();
  if (!clusterClient) {
    throw new Error('Missing clusterClient');
  }
  try {
    await clusterClient
      .asScoped({ headers } as KibanaRequest)
      .callAsCurrentUser('transport.request', {
        path: '/_security/_authenticate',
        method: 'GET',
      });
  } catch (e) {
    throw new Error('ApiKey is not valid: impossible to authicate user');
  }
}

export async function invalidateAPIKey(id: string) {
  const adminUser = await outputService.getAdminUser();
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

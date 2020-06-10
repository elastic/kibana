/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import {
  FakeRequest,
  IRouter,
  KibanaRequest,
  SavedObjectsClientContract,
  IScopedClusterClient,
} from 'src/core/server';
import { SetupPlugins } from '../../plugin';

const ENDPOINT_MANAGER_ROLE = 'endpoint_manager_role';
const ENDPOINT_MANAGER_USERNAME = 'endpoint_admin';

/**
 * Registers the setup route that enables the creation of an endpoint user
 */
export function postEndpointSetup(router: IRouter, security: SetupPlugins['security']) {
  router.post(
    {
      path: '/api/endpoint/setup', // TODO
      validate: {},
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        const soClient = context.core.savedObjects.client;
        const client = context.core.elasticsearch.legacy.client;
        await setupEndpointUser(soClient, security, client);
        return res.ok();
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}

/**
 * Creates the endpoint user and generates an API key to be used by endpoints while communicating with Kibana
 */
async function setupEndpointUser(
  soClient: SavedObjectsClientContract,
  security: SetupPlugins['security'],
  client: IScopedClusterClient // todo
) {
  const res = await client.callAsCurrentUser('transport.request', {
    method: 'PUT',
    path: `/_security/role/${ENDPOINT_MANAGER_ROLE}`,
    body: {
      cluster: ['monitor', 'manage_api_key'],
      indices: [
        {
          names: ['logs-*', 'metrics-*', 'events-*'],
          privileges: ['write', 'create_index'],
        },
      ],
    },
  });

  const password = Buffer.from(uuid.v4()).toString('base64');

  const resp = await client.callAsCurrentUser('transport.request', {
    method: 'PUT',
    path: `/_security/user/${ENDPOINT_MANAGER_USERNAME}`,
    body: {
      password,
      roles: [ENDPOINT_MANAGER_ROLE],
      metadata: {
        updated_at: new Date().toISOString(),
      },
    },
  });

  const request: FakeRequest = {
    headers: {
      authorization: `Basic ${Buffer.from(`${ENDPOINT_MANAGER_USERNAME}:${password}`).toString(
        'base64'
      )}`,
    },
  };

  if (!security) {
    throw new Error('Missing security plugin');
  }

  const apikey = await security.authc.createAPIKey(request as KibanaRequest, {
    name: 'test-api2',
    role_descriptors: {}, // TODO
  });
}

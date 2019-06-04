/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ID,
  API_ROOT,
  API_INTEGRATIONS_LIST,
  API_INTEGRATIONS_INFO,
  API_INTEGRATIONS_FILE,
  SAVED_OBJECT_TYPE,
} from '../common/constants';
import { Request, Server } from '../common/types';
import { fetchInfo, fetchList, getZipInfo } from './registry';
import { getClient } from './saved_objects';

interface RequestFacade extends Request {
  server: Server;
}

interface PostRequest extends Request {
  payload: {
    body: string;
  };
}

// Manager public API paths (currently essentially a proxy to registry service)
export const routes = [
  {
    method: 'GET',
    path: API_INTEGRATIONS_LIST,
    options: { tags: [`access:${ID}`] },
    handler: fetchList,
  },
  {
    method: 'GET',
    path: API_INTEGRATIONS_INFO,
    options: { tags: [`access:${ID}`] },
    handler: async (req: RequestFacade) => fetchInfo(req.params.pkgkey),
  },
  {
    method: 'GET',
    path: API_INTEGRATIONS_FILE,
    options: { tags: [`access:${ID}`] },
    handler: async (req: RequestFacade) => {
      const { pkgkey } = req.params;
      const directory = await getZipInfo(pkgkey);
      return { meta: { pkgkey, directory } };
    },
  },
  {
    method: 'GET',
    path: `${API_ROOT}/saved_objects`,
    options: { tags: [`access:${ID}`] },
    handler: async ({ server }: RequestFacade) => {
      const client = getClient(server);
      const savedObject = await client.find({ type: SAVED_OBJECT_TYPE });
      return savedObject;
    },
  },
  {
    method: 'GET',
    path: `${API_ROOT}/saved_objects/{oid}`,
    options: { tags: [`access:${ID}`] },
    handler: async ({ server, params }: RequestFacade) => {
      const client = getClient(server);

      const savedObject = await client.get(SAVED_OBJECT_TYPE, params.oid);
      return savedObject;
    },
  },
  {
    method: 'POST',
    path: `${API_ROOT}/saved_objects`,
    options: { tags: [`access:${ID}`] },
    handler: async ({ server, payload }: PostRequest) => {
      const { body } = payload;
      const savedObject = await getClient(server).create(
        SAVED_OBJECT_TYPE,
        {
          is_working: true,
          other: body,
        },
        { id: 'TBD', overwrite: true }
      );
      return savedObject;
    },
  },
];

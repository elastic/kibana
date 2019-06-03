/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import {
  ID,
  API_ROOT,
  API_INTEGRATIONS_LIST,
  API_INTEGRATIONS_INFO,
  API_INTEGRATIONS_FILE,
  SAVED_OBJECT_TYPE,
} from '../common/constants';
import { fetchInfo, fetchList, getZipInfo } from './registry';
import { getClient } from './saved_objects';

interface Req extends Request {
  payload: Payload;
}

interface Payload {
  body: string;
}

// Manager public API paths (currently essentially a proxy to registry service)
export const routes = [
  {
    method: 'GET',
    path: API_INTEGRATIONS_LIST,
    options: {
      tags: [`access:${ID}`],
    },
    handler: fetchList,
  },
  {
    method: 'GET',
    path: API_INTEGRATIONS_INFO,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: Request) => fetchInfo(req.params.pkgkey),
  },
  {
    method: 'GET',
    path: API_INTEGRATIONS_FILE,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: Request) => {
      const { pkgkey } = req.params;
      const directory = await getZipInfo(pkgkey);
      return { meta: { pkgkey, directory } };
    },
  },
  {
    method: 'GET',
    path: `${API_ROOT}/saved_objects`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async ({ server }: Request) => {
      const client = getClient(server);
      const savedObject = await client.find({ type: SAVED_OBJECT_TYPE });
      return savedObject;
    },
  },
  {
    method: 'GET',
    path: `${API_ROOT}/saved_objects/{oid}`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async ({ server, params }: Request) => {
      const client = getClient(server);

      const savedObject = await client.get(SAVED_OBJECT_TYPE, params.oid);
      return savedObject;
    },
  },
  {
    method: 'POST',
    path: `${API_ROOT}/saved_objects`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async ({ server, payload }: Req) => {
      // eslint-disable-next-line
      const { body } = payload
      const savedObject = await getClient(server).create(
        SAVED_OBJECT_TYPE,
        {
          is_working: true,
          other: body as string,
        },
        { id: 'TBD', overwrite: true }
      );
      return savedObject;
    },
  },
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ID, API } from '../common/constants';
import { fetchInfo, fetchList, getZipInfo } from './registry';

// Manager public API paths (currently essentially a proxy to registry service)
export const routes = [
  {
    method: 'GET',
    path: API.FETCH_LIST,
    options: {
      tags: [`access:${ID}`],
    },
    handler: fetchList,
  },
  {
    method: 'GET',
    path: API.FETCH_INFO,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: { params: { pkgkey: string } }) => fetchInfo(req.params.pkgkey),
  },
  {
    method: 'GET',
    path: API.FETCH_FILE,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: { params: { pkgkey: string } }) => {
      const { pkgkey } = req.params;
      const directory = await getZipInfo(pkgkey);
      return { meta: { pkgkey, directory } };
    },
  },
];

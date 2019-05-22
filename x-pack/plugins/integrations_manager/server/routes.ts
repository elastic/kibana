/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ID } from '../common/constants';
import * as RS from './registry';
const API_ROOT = `/api/${ID}`;

// Manager public API paths (currently essentially a proxy to registry service)
export const getInfoUrl = ({ name, version }) => `${API_ROOT}/package/${name}-${version}`;

export const routes = [
  {
    method: 'GET',
    path: `${API_ROOT}/list`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: RS.fetchList,
  },
  {
    method: 'GET',
    path: `${API_ROOT}/package/{pkgkey}`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: { params: { pkgkey: string } }) => RS.fetchInfo(req.params.pkgkey),
  },
  {
    method: 'GET',
    path: `${API_ROOT}/package/{pkgkey}/get`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: { params: { pkgkey: string } }) => {
      const { pkgkey } = req.params;
      const data = await RS.fetchZip(pkgkey);
      return { meta: { pkgkey, size: `${data.length / 1024}kB` } };
    },
  },
];

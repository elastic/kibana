/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';
import https from 'https';
import { ID } from '../common/constants';

const REGISTRY = process.env.REGISTRY || 'http://localhost:8080';
const API_ROOT = `/api/${ID}`;

// Manager public API paths (currently essentially a proxy to registry service)
export const routes = [
  {
    method: 'GET',
    path: `${API_ROOT}/`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: any) => {
      const data = await requestJson(REGISTRY);
      return data;
    },
  },
  {
    method: 'GET',
    path: `${API_ROOT}/list`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: any) => {
      const data = await requestJson(`${REGISTRY}/list`);
      return data;
    },
  },
  {
    method: 'GET',
    path: `${API_ROOT}/package/{pkgkey}`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: { params: { pkgkey: string } }) =>
      requestJson(`${REGISTRY}/package/${req.params.pkgkey}`),
  },
  {
    method: 'GET',
    path: `${API_ROOT}/package/{pkgkey}/get`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async (req: { params: { pkgkey: string } }) => {
      const { pkgkey } = req.params;
      const data = await fetchUrl(`${REGISTRY}/package/${pkgkey}/get`);
      return { meta: { pkgkey, length: data.length } };
    },
  },
];

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;

    const request = lib.get(url, response => {
      const body: string[] = [];
      response.on('data', (chunk: string) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });

    request.on('error', reject);
  });
}

async function requestJson(url: string) {
  try {
    const json = await fetchUrl(url);
    const data = JSON.parse(json);
    return data;
  } catch (e) {
    throw e;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { CoreSetup } from 'src/core/server';

import http from 'http'
import https from 'https'

const ID = 'integrations_manager'
const REGISTRY = process.env.REGISTRY || 'http://localhost:8080'
const API_ROOT = `/api/${ID}`;

// Manager public API paths (currently essentially a proxy to registry service)
const routes = { 
  reg_info: {
    method: 'GET',
    path: `${API_ROOT}/`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async req => {
      const data = await requestJson(REGISTRY)
      return data
    }
  },
  reg_list: {
    method: 'GET',
    path: `${API_ROOT}/list`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async req => {
      const data = await requestJson(`${REGISTRY}/list`)
      return data
    }
  },
  reg_package: {
    method: 'GET',
    path: `${API_ROOT}/package/{pkgkey}`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async req => {
      const data = await requestJson(`${REGISTRY}/package/${req.params.pkgkey}`)
      return data
    }
  },
  reg_package_get: {
    method: 'GET',
    path: `${API_ROOT}/package/{pkgkey}/get`,
    options: {
      tags: [`access:${ID}`],
    },
    handler: async req => {
      const url = `${REGISTRY}/package/${req.params.pkgkey}/get`
      const data = await request(url)
      return { meta: { WIP: true, url, length: data.length } }
    }
  }
}

class Plugin {
  public setup(core: CoreSetup) {
    const { server } = core.http;
    Object.values(routes).forEach((route) => server.route(route))
  }
}

function request(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;

    const request = lib.get(url, (response) => {
      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });

    request.on('error', reject)
  })
}

async function requestJson(url) {
  try {
    const json = await request(url)
    const data = JSON.parse(json)
    return data
  } catch (e) {
    throw e
  }

}

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin();
}
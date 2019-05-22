/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';
import https from 'https';

const REGISTRY = process.env.REGISTRY || 'http://localhost:8080';

export async function fetchList() {
  // return fetchJson(`${REGISTRY}/list`);
  // use format shown in https://github.com/elastic/integrations-registry/pull/1
  return [
    {
      description: 'This is the envoyproxy integration.',
      icon: '/img/envoyproxy-0.0.2.png',
      name: 'envoyproxy',
      version: '0.0.2',
    },
    {
      description: 'This is the envoyproxy integration with improved features.',
      icon: '/img/envoyproxy-0.0.5.png',
      name: 'envoyproxy',
      version: '0.0.5',
    },
  ];
}

export async function fetchInfo(key: string) {
  return fetchJson(`${REGISTRY}/package/${key}`);
}

export async function fetchZip(key: string) {
  return fetchUrl(`${REGISTRY}/package/${key}/get`);
}

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

async function fetchJson(url: string) {
  try {
    const json = await fetchUrl(url);
    const data = JSON.parse(json);
    return data;
  } catch (e) {
    throw e;
  }
}

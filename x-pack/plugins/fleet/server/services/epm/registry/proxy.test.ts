/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxyAgent, getProxyAgentOptions } from './proxy';

describe('getProxyAgent', () => {
  test('return HttpsProxyAgent for https proxy url', () => {
    const agent = getProxyAgent({
      proxyUrl: 'https://proxyhost',
      targetUrl: 'https://targethost',
    });
    expect(agent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('return HttpProxyAgent for http proxy url', () => {
    const agent = getProxyAgent({
      proxyUrl: 'http://proxyhost',
      targetUrl: 'http://targethost',
    });
    expect(agent instanceof HttpProxyAgent).toBeTruthy();
  });
});

describe('getProxyAgentOptions', () => {
  test('return url only for https', () => {
    const httpsProxy = 'https://12.34.56.78:910';

    const optionsA = getProxyAgentOptions({
      proxyUrl: httpsProxy,
      targetUrl: 'https://targethost',
    });
    expect(optionsA).toEqual({
      headers: { Host: 'targethost' },
      host: '12.34.56.78',
      port: 910,
      protocol: 'https:',
      rejectUnauthorized: undefined,
    });

    const optionsB = getProxyAgentOptions({
      proxyUrl: httpsProxy,
      targetUrl: 'https://example.com/?a=b&c=d',
    });
    expect(optionsB).toEqual({
      headers: { Host: 'example.com' },
      host: '12.34.56.78',
      port: 910,
      protocol: 'https:',
      rejectUnauthorized: undefined,
    });

    // given http value and https proxy
    const optionsC = getProxyAgentOptions({
      proxyUrl: httpsProxy,
      targetUrl: 'http://example.com/?a=b&c=d',
    });
    expect(optionsC).toEqual({
      headers: { Host: 'example.com' },
      host: '12.34.56.78',
      port: 910,
      protocol: 'https:',
      rejectUnauthorized: undefined,
    });
  });
});

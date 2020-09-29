/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxyAgent, getProxyAgentOptions, getProxyForUrl } from './proxy';

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

// getProxyForUrl is currently an alias for https://github.com/Rob--W/proxy-from-env
// see those docs & tests for all the environment variables it supports
// these tests set some different ones to confirm they work,
// but aren't meant to be convey all that's supported or possible
describe('getProxyForUrl', () => {
  test('if https_proxy env is set - return url only for https', () => {
    const proxyA = 'https://12.34.56.78:910';
    process.env.https_proxy = proxyA;

    const urlA = getProxyForUrl('https://example.com/?a=b&c=d');
    expect(urlA).toBe(proxyA);

    // given http value and https proxy
    const urlB = getProxyForUrl('http://example.com/?a=b&c=d');
    expect(urlB).toBe('');

    delete process.env.https_proxy;
  });

  test('if ALL_PROXY env is set - return url for https & http', () => {
    const proxyA = 'https://some.tld';
    process.env.ALL_PROXY = proxyA;

    const urlA = getProxyForUrl('https://example.com/?a=b&c=d');
    expect(urlA).toBe(proxyA);

    // given http value and https proxy
    const urlB = getProxyForUrl('http://example.com/?a=b&c=d');
    expect(urlB).toBe(proxyA);

    delete process.env.ALL_PROXY;
  });

  // putting these at the end to help catch if we don't clean up process.env mutations above
  test('if no env variables are set - return empty string for all', () => {
    const urlA = getProxyForUrl('https://example.com/?a=b&c=d');
    expect(urlA).toBe('');

    const urlB = getProxyForUrl('http://example.com/?a=b&c=d');
    expect(urlB).toBe('');
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

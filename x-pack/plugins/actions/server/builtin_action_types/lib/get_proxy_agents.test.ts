/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '../../../../../../src/core/server';
import { getProxyAgents } from './get_proxy_agents';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('getProxyAgents', () => {
  test('get agents for valid proxy URL', () => {
    const { httpAgent, httpsAgent } = getProxyAgents(
      { proxyUrl: 'https://someproxyhost', proxyRejectUnauthorizedCertificates: false },
      logger
    );
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('return undefined agents for invalid proxy URL', () => {
    const { httpAgent, httpsAgent } = getProxyAgents(
      { proxyUrl: ':nope: not a valid URL', proxyRejectUnauthorizedCertificates: false },
      logger
    );
    expect(httpAgent).toBe(undefined);
    expect(httpsAgent).toBe(undefined);
  });

  test('return undefined agents for null proxy options', () => {
    const { httpAgent, httpsAgent } = getProxyAgents(null, logger);
    expect(httpAgent).toBe(undefined);
    expect(httpsAgent).toBe(undefined);
  });

  test('return undefined agents for undefined proxy options', () => {
    const { httpAgent, httpsAgent } = getProxyAgents(undefined, logger);
    expect(httpAgent).toBe(undefined);
    expect(httpsAgent).toBe(undefined);
  });
});

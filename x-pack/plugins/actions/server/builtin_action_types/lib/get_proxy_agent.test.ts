/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '../../../../../../src/core/server';
import { getProxyAgent } from './get_proxy_agent';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('getProxyAgent', () => {
  test('return HttpsProxyAgent for https proxy url', () => {
    const agent = getProxyAgent(
      { proxyUrl: 'https://someproxyhost', proxyRejectUnauthorizedCertificates: false },
      logger
    );
    expect(agent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('return HttpProxyAgent for http proxy url', () => {
    const agent = getProxyAgent(
      { proxyUrl: 'http://someproxyhost', proxyRejectUnauthorizedCertificates: false },
      logger
    );
    expect(agent instanceof HttpProxyAgent).toBeTruthy();
  });
});

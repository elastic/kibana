/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Agent as HttpsAgent } from 'https';
import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '../../../../../../src/core/server';
import { getProxyAgents } from './get_proxy_agents';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('getProxyAgents', () => {
  const configurationUtilities = actionsConfigMock.create();

  test('get agents for valid proxy URL', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxyRejectUnauthorizedCertificates: false,
    });
    const { httpAgent, httpsAgent } = getProxyAgents(configurationUtilities, logger);
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('return default agents for invalid proxy URL', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: ':nope: not a valid URL',
      proxyRejectUnauthorizedCertificates: false,
    });
    const { httpAgent, httpsAgent } = getProxyAgents(configurationUtilities, logger);
    expect(httpAgent).toBe(undefined);
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
  });

  test('return default agents for undefined proxy options', () => {
    const { httpAgent, httpsAgent } = getProxyAgents(configurationUtilities, logger);
    expect(httpAgent).toBe(undefined);
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
  });
});

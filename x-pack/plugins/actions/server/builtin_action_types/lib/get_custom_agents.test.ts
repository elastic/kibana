/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent as HttpsAgent } from 'https';
import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '../../../../../../src/core/server';
import { getCustomAgents } from './get_custom_agents';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const targetHost = 'elastic.co';
const targetUrl = `https://${targetHost}/foo/bar/baz`;
const nonMatchingUrl = `https://${targetHost}m/foo/bar/baz`;

describe('getCustomAgents', () => {
  const configurationUtilities = actionsConfigMock.create();

  test('get agents for valid proxy URL', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxyRejectUnauthorizedCertificates: false,
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    });
    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('return default agents for invalid proxy URL', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: ':nope: not a valid URL',
      proxyRejectUnauthorizedCertificates: false,
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    });
    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent).toBe(undefined);
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
  });

  test('return default agents for undefined proxy options', () => {
    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent).toBe(undefined);
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
  });

  test('returns non-proxy agents for matching proxyBypassHosts', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxyRejectUnauthorizedCertificates: false,
      proxyBypassHosts: new Set([targetHost]),
      proxyOnlyHosts: undefined,
    });
    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent instanceof HttpProxyAgent).toBeFalsy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeFalsy();
  });

  test('returns proxy agents for non-matching proxyBypassHosts', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxyRejectUnauthorizedCertificates: false,
      proxyBypassHosts: new Set([targetHost]),
      proxyOnlyHosts: undefined,
    });
    const { httpAgent, httpsAgent } = getCustomAgents(
      configurationUtilities,
      logger,
      nonMatchingUrl
    );
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('returns proxy agents for matching proxyOnlyHosts', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxyRejectUnauthorizedCertificates: false,
      proxyBypassHosts: undefined,
      proxyOnlyHosts: new Set([targetHost]),
    });
    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
  });

  test('returns non-proxy agents for non-matching proxyOnlyHosts', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxyRejectUnauthorizedCertificates: false,
      proxyBypassHosts: undefined,
      proxyOnlyHosts: new Set([targetHost]),
    });
    const { httpAgent, httpsAgent } = getCustomAgents(
      configurationUtilities,
      logger,
      nonMatchingUrl
    );
    expect(httpAgent instanceof HttpProxyAgent).toBeFalsy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeFalsy();
  });
});

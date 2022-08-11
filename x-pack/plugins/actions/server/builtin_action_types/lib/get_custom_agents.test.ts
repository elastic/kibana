/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent as HttpsAgent } from 'https';
import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '@kbn/core/server';
import { getCustomAgents } from './get_custom_agents';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const targetHost = 'elastic.co';
const targetUrl = `https://${targetHost}/foo/bar/baz`;
const targetUrlCanonical = `https://${targetHost}:443`;
const nonMatchingUrl = `https://${targetHost}m/foo/bar/baz`;

describe('getCustomAgents', () => {
  let configurationUtilities = actionsConfigMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
    configurationUtilities = actionsConfigMock.create();
  });

  test('get agents for valid proxy URL', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
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
      proxySSLSettings: {
        verificationMode: 'none',
      },
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
      proxySSLSettings: {
        verificationMode: 'none',
      },
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
      proxySSLSettings: {
        verificationMode: 'none',
      },
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
      proxySSLSettings: {
        verificationMode: 'none',
      },
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
      proxySSLSettings: {
        verificationMode: 'none',
      },
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

  test('handles custom host settings', () => {
    configurationUtilities.getCustomHostSettings.mockReturnValue({
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'none',
        certificateAuthoritiesData: 'ca data here',
      },
    });
    const { httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpsAgent?.options.ca).toBe('ca data here');
    expect(httpsAgent?.options.rejectUnauthorized).toBe(false);
  });

  test('handles custom host settings with proxy', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    });
    configurationUtilities.getCustomHostSettings.mockReturnValue({
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'none',
        certificateAuthoritiesData: 'ca data here',
      },
    });
    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();

    expect(httpsAgent?.options.ca).toBe('ca data here');
    expect(httpsAgent?.options.rejectUnauthorized).toBe(false);
  });

  test('handles overriding global verificationMode "none"', () => {
    configurationUtilities.getSSLSettings.mockReturnValue({
      verificationMode: 'none',
    });
    configurationUtilities.getCustomHostSettings.mockReturnValue({
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'certificate',
      },
    });

    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent instanceof HttpProxyAgent).toBeFalsy();
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeFalsy();
    expect(httpsAgent?.options.rejectUnauthorized).toBeTruthy();
  });

  test('handles overriding global verificationMode "full"', () => {
    configurationUtilities.getSSLSettings.mockReturnValue({
      verificationMode: 'full',
    });
    configurationUtilities.getCustomHostSettings.mockReturnValue({
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'none',
      },
    });

    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent instanceof HttpProxyAgent).toBeFalsy();
    expect(httpsAgent instanceof HttpsAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeFalsy();
    expect(httpsAgent?.options.rejectUnauthorized).toBeFalsy();
  });

  test('handles overriding global verificationMode "none" with a proxy', () => {
    configurationUtilities.getSSLSettings.mockReturnValue({
      verificationMode: 'none',
    });
    configurationUtilities.getCustomHostSettings.mockReturnValue({
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'full',
      },
    });
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      // note: this setting doesn't come into play, it's for the connection to
      // the proxy, not the target url
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    });

    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
    expect(httpsAgent?.options.rejectUnauthorized).toBeTruthy();
  });

  test('handles overriding global verificationMode "full" with a proxy', () => {
    configurationUtilities.getSSLSettings.mockReturnValue({
      verificationMode: 'full',
    });
    configurationUtilities.getCustomHostSettings.mockReturnValue({
      url: targetUrlCanonical,
      ssl: {
        verificationMode: 'none',
      },
    });
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: 'https://someproxyhost',
      // note: this setting doesn't come into play, it's for the connection to
      // the proxy, not the target url
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    });

    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, targetUrl);
    expect(httpAgent instanceof HttpProxyAgent).toBeTruthy();
    expect(httpsAgent instanceof HttpsProxyAgent).toBeTruthy();
    expect(httpsAgent?.options.rejectUnauthorized).toBeFalsy();
  });
});

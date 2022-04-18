/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ByteSizeValue } from '@kbn/config-schema';
import { ActionsConfig } from './config';
import {
  getActionsConfigurationUtilities,
  AllowedHosts,
  EnabledActionTypes,
} from './actions_config';
import { resolveCustomHosts } from './lib/custom_host_settings';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import moment from 'moment';

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const defaultActionsConfig: ActionsConfig = {
  allowedHosts: [],
  enabledActionTypes: [],
  preconfiguredAlertHistoryEsIndex: false,
  preconfigured: {},
  proxyRejectUnauthorizedCertificates: true, // legacy
  rejectUnauthorized: true, // legacy
  maxResponseContentLength: new ByteSizeValue(1000000),
  responseTimeout: moment.duration(60000),
  cleanupFailedExecutionsTask: {
    enabled: true,
    cleanupInterval: schema.duration().validate('5m'),
    idleInterval: schema.duration().validate('1h'),
    pageSize: 100,
  },
  ssl: {
    proxyVerificationMode: 'full',
    verificationMode: 'full',
  },
};

describe('ensureUriAllowed', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [AllowedHosts.Any],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureUriAllowed('https://github.com/elastic/kibana')
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the allowedHosts', () => {
    const config: ActionsConfig = defaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureUriAllowed('https://github.com/elastic/kibana')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"https://github.com/elastic/kibana\\" is not added to the Kibana config xpack.actions.allowedHosts"`
    );
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsConfig = defaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureUriAllowed('github.com/elastic')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"github.com/elastic\\" is not added to the Kibana config xpack.actions.allowedHosts"`
    );
  });

  test('returns true when the hostname in the requested uri is in the allowedHosts', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: ['github.com'],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureUriAllowed('https://github.com/elastic/kibana')
    ).toBeUndefined();
  });
});

describe('ensureHostnameAllowed', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [AllowedHosts.Any],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureHostnameAllowed('github.com')
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the allowedHosts', () => {
    const config: ActionsConfig = defaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureHostnameAllowed('github.com')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target hostname \\"github.com\\" is not added to the Kibana config xpack.actions.allowedHosts"`
    );
  });

  test('returns true when the hostname in the requested uri is in the allowedHosts', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: ['github.com'],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureHostnameAllowed('github.com')
    ).toBeUndefined();
  });
});

describe('isUriAllowed', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [AllowedHosts.Any],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).isUriAllowed('https://github.com/elastic/kibana')
    ).toEqual(true);
  });

  test('throws when the hostname in the requested uri is not in the allowedHosts', () => {
    const config: ActionsConfig = defaultActionsConfig;
    expect(
      getActionsConfigurationUtilities(config).isUriAllowed('https://github.com/elastic/kibana')
    ).toEqual(false);
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsConfig = defaultActionsConfig;
    expect(getActionsConfigurationUtilities(config).isUriAllowed('github.com/elastic')).toEqual(
      false
    );
  });

  test('returns true when the hostname in the requested uri is in the allowedHosts', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: ['github.com'],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).isUriAllowed('https://github.com/elastic/kibana')
    ).toEqual(true);
  });
});

describe('isHostnameAllowed', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [AllowedHosts.Any],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isHostnameAllowed('github.com')).toEqual(true);
  });

  test('throws when the hostname in the requested uri is not in the allowedHosts', () => {
    const config: ActionsConfig = defaultActionsConfig;
    expect(getActionsConfigurationUtilities(config).isHostnameAllowed('github.com')).toEqual(false);
  });

  test('returns true when the hostname in the requested uri is in the allowedHosts', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: ['github.com'],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isHostnameAllowed('github.com')).toEqual(true);
  });
});

describe('isActionTypeEnabled', () => {
  test('returns true when "any" actionTypes are allowed', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [],
      enabledActionTypes: ['ignore', EnabledActionTypes.Any],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(true);
  });

  test('returns false when no actionType is allowed', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(false);
  });

  test('returns false when the actionType is not in the enabled list', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [],
      enabledActionTypes: ['foo'],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('bar')).toEqual(false);
  });

  test('returns true when the actionType is in the enabled list', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [],
      enabledActionTypes: ['ignore', 'foo'],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(true);
  });
});

describe('ensureActionTypeEnabled', () => {
  test('does not throw when any actionType is allowed', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [],
      enabledActionTypes: ['ignore', EnabledActionTypes.Any],
    };
    expect(getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')).toBeUndefined();
  });

  test('throws when no actionType is not allowed', () => {
    const config: ActionsConfig = defaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')
    ).toThrowErrorMatchingInlineSnapshot(
      `"action type \\"foo\\" is not enabled in the Kibana config xpack.actions.enabledActionTypes"`
    );
  });

  test('throws when actionType is not enabled', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [],
      enabledActionTypes: ['ignore'],
    };
    expect(() =>
      getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')
    ).toThrowErrorMatchingInlineSnapshot(
      `"action type \\"foo\\" is not enabled in the Kibana config xpack.actions.enabledActionTypes"`
    );
  });

  test('does not throw when actionType is enabled', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      allowedHosts: [],
      enabledActionTypes: ['ignore', 'foo'],
    };
    expect(getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')).toBeUndefined();
  });
});

describe('getResponseSettingsFromConfig', () => {
  test('returns expected parsed values for default config for responseTimeout and maxResponseContentLength', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
    };
    expect(getActionsConfigurationUtilities(config).getResponseSettings()).toEqual({
      timeout: 60000,
      maxContentLength: 1000000,
    });
  });
});

describe('getProxySettings', () => {
  test('returns undefined when no proxy URL set', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      proxyHeaders: { someHeaderName: 'some header value' },
      proxyBypassHosts: ['avoid-proxy.co'],
    };

    const proxySettings = getActionsConfigurationUtilities(config).getProxySettings();
    expect(proxySettings).toBeUndefined();
  });

  test('returns proxy url', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
    };
    const proxySettings = getActionsConfigurationUtilities(config).getProxySettings();
    expect(proxySettings?.proxyUrl).toBe(config.proxyUrl);
  });

  test('returns proper verificationMode values, beased on the legacy config option proxyRejectUnauthorizedCertificates', () => {
    const configTrue: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
      proxyRejectUnauthorizedCertificates: true,
    };
    let proxySettings = getActionsConfigurationUtilities(configTrue).getProxySettings();
    expect(proxySettings?.proxySSLSettings.verificationMode).toBe('full');

    const configFalse: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
      proxyRejectUnauthorizedCertificates: false,
      ssl: {},
    };
    proxySettings = getActionsConfigurationUtilities(configFalse).getProxySettings();
    expect(proxySettings?.proxySSLSettings.verificationMode).toBe('none');
  });

  test('returns proper verificationMode value, based on the SSL proxy configuration', () => {
    const configTrue: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
      ssl: {
        proxyVerificationMode: 'full',
      },
    };
    let proxySettings = getActionsConfigurationUtilities(configTrue).getProxySettings();
    expect(proxySettings?.proxySSLSettings.verificationMode).toBe('full');

    const configFalse: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
      ssl: {
        proxyVerificationMode: 'none',
      },
    };
    proxySettings = getActionsConfigurationUtilities(configFalse).getProxySettings();
    expect(proxySettings?.proxySSLSettings.verificationMode).toBe('none');
  });

  test('returns proxy headers', () => {
    const proxyHeaders = {
      someHeaderName: 'some header value',
      someOtherHeader: 'some other header',
    };
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
      proxyHeaders,
    };

    const proxySettings = getActionsConfigurationUtilities(config).getProxySettings();
    expect(proxySettings?.proxyHeaders).toEqual(config.proxyHeaders);
  });

  test('returns proxy bypass hosts', () => {
    const proxyBypassHosts = ['proxy-bypass-1.elastic.co', 'proxy-bypass-2.elastic.co'];
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
      proxyBypassHosts,
    };

    const proxySettings = getActionsConfigurationUtilities(config).getProxySettings();
    expect(proxySettings?.proxyBypassHosts).toEqual(new Set(proxyBypassHosts));
  });

  test('returns proxy only hosts', () => {
    const proxyOnlyHosts = ['proxy-only-1.elastic.co', 'proxy-only-2.elastic.co'];
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
      proxyOnlyHosts,
    };

    const proxySettings = getActionsConfigurationUtilities(config).getProxySettings();
    expect(proxySettings?.proxyOnlyHosts).toEqual(new Set(proxyOnlyHosts));
  });

  test('getCustomHostSettings() returns undefined when no matching config', () => {
    const httpsUrl = 'https://elastic.co/foo/bar';
    const smtpUrl = 'smtp://elastic.co';
    let config: ActionsConfig = resolveCustomHosts(mockLogger, {
      ...defaultActionsConfig,
    });

    let chs = getActionsConfigurationUtilities(config).getCustomHostSettings(httpsUrl);
    expect(chs).toEqual(undefined);
    chs = getActionsConfigurationUtilities(config).getCustomHostSettings(smtpUrl);
    expect(chs).toEqual(undefined);

    config = resolveCustomHosts(mockLogger, {
      ...defaultActionsConfig,
      customHostSettings: [],
    });
    chs = getActionsConfigurationUtilities(config).getCustomHostSettings(httpsUrl);
    expect(chs).toEqual(undefined);
    chs = getActionsConfigurationUtilities(config).getCustomHostSettings(smtpUrl);
    expect(chs).toEqual(undefined);

    config = resolveCustomHosts(mockLogger, {
      ...defaultActionsConfig,
      customHostSettings: [
        {
          url: 'https://www.elastic.co:443',
        },
      ],
    });
    chs = getActionsConfigurationUtilities(config).getCustomHostSettings(httpsUrl);
    expect(chs).toEqual(undefined);
    chs = getActionsConfigurationUtilities(config).getCustomHostSettings(smtpUrl);
    expect(chs).toEqual(undefined);
  });

  test('getCustomHostSettings() returns matching config', () => {
    const httpsUrl = 'https://elastic.co/ignoring/paths/here';
    const smtpUrl = 'smtp://elastic.co:123';
    const config: ActionsConfig = resolveCustomHosts(mockLogger, {
      ...defaultActionsConfig,
      customHostSettings: [
        {
          url: 'https://elastic.co',
          ssl: {
            verificationMode: 'full',
          },
        },
        {
          url: 'smtp://elastic.co:123',
          ssl: {
            verificationMode: 'none',
          },
          smtp: {
            ignoreTLS: true,
          },
        },
      ],
    });

    let chs = getActionsConfigurationUtilities(config).getCustomHostSettings(httpsUrl);
    expect(chs).toEqual(config.customHostSettings![0]);
    chs = getActionsConfigurationUtilities(config).getCustomHostSettings(smtpUrl);
    expect(chs).toEqual(config.customHostSettings![1]);
  });

  test('getCustomHostSettings() returns undefined when bad url is passed in', () => {
    const badUrl = 'https://elastic.co/foo/bar';
    const config: ActionsConfig = resolveCustomHosts(mockLogger, {
      ...defaultActionsConfig,
    });

    const chs = getActionsConfigurationUtilities(config).getCustomHostSettings(badUrl);
    expect(chs).toEqual(undefined);
  });
});

describe('getSSLSettings', () => {
  test('returns proper verificationMode value, based on the SSL proxy configuration', () => {
    const configTrue: ActionsConfig = {
      ...defaultActionsConfig,
      ssl: {
        verificationMode: 'full',
      },
    };
    let sslSettings = getActionsConfigurationUtilities(configTrue).getSSLSettings();
    expect(sslSettings.verificationMode).toBe('full');

    const configFalse: ActionsConfig = {
      ...defaultActionsConfig,
      ssl: {
        verificationMode: 'none',
      },
    };
    sslSettings = getActionsConfigurationUtilities(configFalse).getSSLSettings();
    expect(sslSettings.verificationMode).toBe('none');
  });
});

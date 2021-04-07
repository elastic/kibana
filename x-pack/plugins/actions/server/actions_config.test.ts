/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { ActionsConfig } from './config';
import {
  getActionsConfigurationUtilities,
  AllowedHosts,
  EnabledActionTypes,
} from './actions_config';
import moment from 'moment';

const defaultActionsConfig: ActionsConfig = {
  enabled: false,
  allowedHosts: [],
  enabledActionTypes: [],
  preconfigured: {},
  proxyRejectUnauthorizedCertificates: true,
  rejectUnauthorized: true,
  maxResponseContentLength: new ByteSizeValue(1000000),
  responseTimeout: moment.duration(60000),
};

describe('ensureUriAllowed', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      enabled: false,
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
      enabled: false,
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
      enabled: false,
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
      enabled: false,
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
      enabled: false,
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
      enabled: false,
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
      enabled: false,
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
      enabled: false,
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
      enabled: false,
      allowedHosts: [],
      enabledActionTypes: ['ignore', EnabledActionTypes.Any],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(true);
  });

  test('returns false when no actionType is allowed', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      enabled: false,
      allowedHosts: [],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(false);
  });

  test('returns false when the actionType is not in the enabled list', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      enabled: false,
      allowedHosts: [],
      enabledActionTypes: ['foo'],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('bar')).toEqual(false);
  });

  test('returns true when the actionType is in the enabled list', () => {
    const config: ActionsConfig = {
      ...defaultActionsConfig,
      enabled: false,
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
      enabled: false,
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
      enabled: false,
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
      enabled: false,
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

  test('returns proxyRejectUnauthorizedCertificates', () => {
    const configTrue: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
      proxyRejectUnauthorizedCertificates: true,
    };
    let proxySettings = getActionsConfigurationUtilities(configTrue).getProxySettings();
    expect(proxySettings?.proxyRejectUnauthorizedCertificates).toBe(true);

    const configFalse: ActionsConfig = {
      ...defaultActionsConfig,
      proxyUrl: 'https://proxy.elastic.co',
      proxyRejectUnauthorizedCertificates: false,
    };
    proxySettings = getActionsConfigurationUtilities(configFalse).getProxySettings();
    expect(proxySettings?.proxyRejectUnauthorizedCertificates).toBe(false);
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
});

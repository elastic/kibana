/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsConfigType } from './types';
import {
  getActionsConfigurationUtilities,
  AllowedHosts,
  EnabledActionTypes,
} from './actions_config';

const DefaultActionsConfig: ActionsConfigType = {
  enabled: false,
  allowedHosts: [],
  enabledActionTypes: [],
};

describe('ensureUriAllowed', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [AllowedHosts.Any],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureUriAllowed('https://github.com/elastic/kibana')
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the allowedHosts', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureUriAllowed('https://github.com/elastic/kibana')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"https://github.com/elastic/kibana\\" is not added to the Kibana config xpack.actions.allowedHosts"`
    );
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureUriAllowed('github.com/elastic')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"github.com/elastic\\" is not added to the Kibana config xpack.actions.allowedHosts"`
    );
  });

  test('returns true when the hostname in the requested uri is in the allowedHosts', () => {
    const config: ActionsConfigType = {
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
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [AllowedHosts.Any],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureHostnameAllowed('github.com')
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the allowedHosts', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureHostnameAllowed('github.com')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target hostname \\"github.com\\" is not added to the Kibana config xpack.actions.allowedHosts"`
    );
  });

  test('returns true when the hostname in the requested uri is in the allowedHosts', () => {
    const config: ActionsConfigType = {
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
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [AllowedHosts.Any],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).isUriAllowed('https://github.com/elastic/kibana')
    ).toEqual(true);
  });

  test('throws when the hostname in the requested uri is not in the allowedHosts', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(
      getActionsConfigurationUtilities(config).isUriAllowed('https://github.com/elastic/kibana')
    ).toEqual(false);
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(getActionsConfigurationUtilities(config).isUriAllowed('github.com/elastic')).toEqual(
      false
    );
  });

  test('returns true when the hostname in the requested uri is in the allowedHosts', () => {
    const config: ActionsConfigType = {
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
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [AllowedHosts.Any],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isHostnameAllowed('github.com')).toEqual(true);
  });

  test('throws when the hostname in the requested uri is not in the allowedHosts', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(getActionsConfigurationUtilities(config).isHostnameAllowed('github.com')).toEqual(false);
  });

  test('returns true when the hostname in the requested uri is in the allowedHosts', () => {
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: ['github.com'],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isHostnameAllowed('github.com')).toEqual(true);
  });
});

describe('isActionTypeEnabled', () => {
  test('returns true when "any" actionTypes are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [],
      enabledActionTypes: ['ignore', EnabledActionTypes.Any],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(true);
  });

  test('returns false when no actionType is allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(false);
  });

  test('returns false when the actionType is not in the enabled list', () => {
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [],
      enabledActionTypes: ['foo'],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('bar')).toEqual(false);
  });

  test('returns true when the actionType is in the enabled list', () => {
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [],
      enabledActionTypes: ['ignore', 'foo'],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(true);
  });
});

describe('ensureActionTypeEnabled', () => {
  test('does not throw when any actionType is allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [],
      enabledActionTypes: ['ignore', EnabledActionTypes.Any],
    };
    expect(getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')).toBeUndefined();
  });

  test('throws when no actionType is not allowed', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')
    ).toThrowErrorMatchingInlineSnapshot(
      `"action type \\"foo\\" is not enabled in the Kibana config xpack.actions.enabledActionTypes"`
    );
  });

  test('throws when actionType is not enabled', () => {
    const config: ActionsConfigType = {
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
    const config: ActionsConfigType = {
      enabled: false,
      allowedHosts: [],
      enabledActionTypes: ['ignore', 'foo'],
    };
    expect(getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')).toBeUndefined();
  });
});

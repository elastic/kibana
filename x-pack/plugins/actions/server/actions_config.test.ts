/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsConfigType } from './types';
import {
  getActionsConfigurationUtilities,
  HostsAllowList,
  EnabledActionTypes,
} from './actions_config';

const DefaultActionsConfig: ActionsConfigType = {
  enabled: false,
  hostsAllowList: [],
  enabledActionTypes: [],
};

describe('ensureAllowListedUri', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: [HostsAllowList.Any],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureAllowListedUri(
        'https://github.com/elastic/kibana'
      )
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the hostsAllowList', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureAllowListedUri(
        'https://github.com/elastic/kibana'
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"https://github.com/elastic/kibana\\" is not present in the Kibana config xpack.actions.hostsAllowList"`
    );
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureAllowListedUri('github.com/elastic')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"github.com/elastic\\" is not present in the Kibana config xpack.actions.hostsAllowList"`
    );
  });

  test('returns true when the hostname in the requested uri is in the hostsAllowList', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: ['github.com'],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureAllowListedUri(
        'https://github.com/elastic/kibana'
      )
    ).toBeUndefined();
  });
});

describe('ensureAllowListedHostname', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: [HostsAllowList.Any],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureAllowListedHostname('github.com')
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the hostsAllowList', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(() =>
      getActionsConfigurationUtilities(config).ensureAllowListedHostname('github.com')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target hostname \\"github.com\\" is not present in the Kibana config xpack.actions.hostsAllowList"`
    );
  });

  test('returns true when the hostname in the requested uri is in the hostsAllowList', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: ['github.com'],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureAllowListedHostname('github.com')
    ).toBeUndefined();
  });
});

describe('isAllowListedUri', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: [HostsAllowList.Any],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).isAllowListedUri('https://github.com/elastic/kibana')
    ).toEqual(true);
  });

  test('throws when the hostname in the requested uri is not in the hostsAllowList', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(
      getActionsConfigurationUtilities(config).isAllowListedUri('https://github.com/elastic/kibana')
    ).toEqual(false);
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(getActionsConfigurationUtilities(config).isAllowListedUri('github.com/elastic')).toEqual(
      false
    );
  });

  test('returns true when the hostname in the requested uri is in the hostsAllowList', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: ['github.com'],
      enabledActionTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).isAllowListedUri('https://github.com/elastic/kibana')
    ).toEqual(true);
  });
});

describe('isAllowListedHostname', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: [HostsAllowList.Any],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isAllowListedHostname('github.com')).toEqual(
      true
    );
  });

  test('throws when the hostname in the requested uri is not in the hostsAllowList', () => {
    const config: ActionsConfigType = DefaultActionsConfig;
    expect(getActionsConfigurationUtilities(config).isAllowListedHostname('github.com')).toEqual(
      false
    );
  });

  test('returns true when the hostname in the requested uri is in the hostsAllowList', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: ['github.com'],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isAllowListedHostname('github.com')).toEqual(
      true
    );
  });
});

describe('isActionTypeEnabled', () => {
  test('returns true when "any" actionTypes are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: [],
      enabledActionTypes: ['ignore', EnabledActionTypes.Any],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(true);
  });

  test('returns false when no actionType is allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: [],
      enabledActionTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(false);
  });

  test('returns false when the actionType is not in the enabled list', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: [],
      enabledActionTypes: ['foo'],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('bar')).toEqual(false);
  });

  test('returns true when the actionType is in the enabled list', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: [],
      enabledActionTypes: ['ignore', 'foo'],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(true);
  });
});

describe('ensureActionTypeEnabled', () => {
  test('does not throw when any actionType is allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      hostsAllowList: [],
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
      hostsAllowList: [],
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
      hostsAllowList: [],
      enabledActionTypes: ['ignore', 'foo'],
    };
    expect(getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')).toBeUndefined();
  });
});

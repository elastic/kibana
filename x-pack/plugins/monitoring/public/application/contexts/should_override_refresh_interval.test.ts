/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { shouldOverrideRefreshInterval } from './should_override_refresh_interval';
import { MonitoringStartPluginDependencies, MonitoringStartServices } from '../../types';

const getMockArguments = ({
  isDefaultSettings = true,
  isRefreshIntervalTouched = false,
  refreshInterval = { pause: false, value: 0 },
}) => {
  const timefilter = {
    isRefreshIntervalTouched: () => isRefreshIntervalTouched,
    getRefreshInterval: () => refreshInterval,
  } as MonitoringStartPluginDependencies['data']['query']['timefilter']['timefilter'];

  const uiSettings = {
    isDefault: () => isDefaultSettings,
  } as unknown as MonitoringStartServices['uiSettings'];

  return {
    timefilter,
    uiSettings,
  };
};

describe('shouldOverrideRefreshInterval', () => {
  test('should not override when the interval was updated with the timefilter', () => {
    const { uiSettings, timefilter } = getMockArguments({ isDefaultSettings: false });
    expect(shouldOverrideRefreshInterval(uiSettings, timefilter)).toBe(false);
  });

  test('should not override when the interval was updated with the settings', () => {
    const { uiSettings, timefilter } = getMockArguments({ isDefaultSettings: false });
    expect(shouldOverrideRefreshInterval(uiSettings, timefilter)).toBe(false);
  });

  test('should override when the default is a paused interval', () => {
    let { uiSettings, timefilter } = getMockArguments({
      isDefaultSettings: true,
      refreshInterval: { pause: true, value: 10000 },
    });
    expect(shouldOverrideRefreshInterval(uiSettings, timefilter)).toBe(true);

    ({ uiSettings, timefilter } = getMockArguments({
      isDefaultSettings: true,
      refreshInterval: { pause: false, value: 0 },
    }));
    expect(shouldOverrideRefreshInterval(uiSettings, timefilter)).toBe(true);
  });
});

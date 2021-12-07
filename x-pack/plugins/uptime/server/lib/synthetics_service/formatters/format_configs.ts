/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNil, omitBy } from 'lodash';
import { ConfigKey, MonitorFields } from '../../../../common/runtime_types/monitor_management';
import { formatters } from './index';

const UI_KEYS = [
  ConfigKey.METADATA,
  ConfigKey.UPLOAD_SPEED,
  ConfigKey.DOWNLOAD_SPEED,
  ConfigKey.LATENCY,
  ConfigKey.THROTTLING_CONFIG,
  ConfigKey.IS_THROTTLING_ENABLED,
  ConfigKey.PASSWORD,
];

interface HeartbeatConfig {
  throttling: boolean | string;
}

export const formatMonitorConfig = (
  configKeys: ConfigKey[],
  config: Partial<MonitorFields & HeartbeatConfig>
) => {
  const formattedMonitor = {} as Record<ConfigKey, any> & HeartbeatConfig;

  configKeys.forEach((key) => {
    if (!UI_KEYS.includes(key)) {
      const value = config[key] ?? null;
      if (value && formatters[key]) {
        formattedMonitor[key] = formatters[key]?.(config);
      } else if (value) {
        formattedMonitor[key] = value;
      }
    }
    if (key === ConfigKey.THROTTLING_CONFIG && config[key]) {
      formattedMonitor.throttling = config[key] as string;
    }
    if (key === ConfigKey.IS_THROTTLING_ENABLED && config[key] === false) {
      formattedMonitor.throttling = false;
    }
  });

  return omitBy(formattedMonitor, isNil) as Partial<MonitorFields>;
};

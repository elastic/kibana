/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNil, omitBy } from 'lodash';
import { ConfigKey, MonitorFields } from '../../../../common/runtime_types';
import { formatters } from './index';

const UI_KEYS_TO_SKIP = [
  ConfigKey.METADATA,
  ConfigKey.UPLOAD_SPEED,
  ConfigKey.DOWNLOAD_SPEED,
  ConfigKey.LATENCY,
  ConfigKey.IS_THROTTLING_ENABLED,
];

const uiToHeartbeatKeyMap = {
  throttling: ConfigKey.THROTTLING_CONFIG,
};

type YamlKeys = keyof typeof uiToHeartbeatKeyMap;

export const formatMonitorConfig = (configKeys: ConfigKey[], config: Partial<MonitorFields>) => {
  const formattedMonitor = {} as Record<ConfigKey | YamlKeys, any>;

  configKeys.forEach((key) => {
    if (!UI_KEYS_TO_SKIP.includes(key)) {
      const value = config[key] ?? null;

      if (value === null || value === '') {
        return;
      }

      formattedMonitor[key] = !!formatters[key] ? formatters[key]?.(config) : value;
    }
  });

  Object.keys(uiToHeartbeatKeyMap).forEach((key) => {
    const hbKey = key as YamlKeys;
    const configKey = uiToHeartbeatKeyMap[hbKey];
    formattedMonitor[hbKey] = formattedMonitor[configKey];
    delete formattedMonitor[configKey];
  });

  return omitBy(formattedMonitor, isNil) as Partial<MonitorFields>;
};

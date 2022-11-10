/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNil, omitBy } from 'lodash';
import {
  BrowserFields,
  ConfigKey,
  MonitorFields,
  SyntheticsMonitor,
  HeartbeatConfig,
} from '../../../common/runtime_types';
import { formatters } from '.';

const UI_KEYS_TO_SKIP = [
  ConfigKey.JOURNEY_ID,
  ConfigKey.PROJECT_ID,
  ConfigKey.METADATA,
  ConfigKey.UPLOAD_SPEED,
  ConfigKey.DOWNLOAD_SPEED,
  ConfigKey.LATENCY,
  ConfigKey.IS_THROTTLING_ENABLED,
  ConfigKey.REVISION,
  ConfigKey.CUSTOM_HEARTBEAT_ID,
  ConfigKey.FORM_MONITOR_TYPE,
  ConfigKey.TEXT_ASSERTION,
  ConfigKey.CONFIG_HASH,
  'secrets',
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

export const formatHeartbeatRequest = ({
  monitor,
  monitorId,
  customHeartbeatId,
  runOnce,
  testRunId,
}: {
  monitor: SyntheticsMonitor;
  monitorId: string;
  customHeartbeatId?: string;
  runOnce?: boolean;
  testRunId?: string;
}): HeartbeatConfig => {
  const projectId = (monitor as BrowserFields)[ConfigKey.PROJECT_ID];
  return {
    ...monitor,
    id: customHeartbeatId || monitorId,
    fields: {
      config_id: monitorId,
      'monitor.project.name': projectId || undefined,
      'monitor.project.id': projectId || undefined,
      run_once: runOnce,
      test_run_id: testRunId,
    },
    fields_under_root: true,
  };
};

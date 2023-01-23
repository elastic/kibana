/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isNil, omitBy } from 'lodash';
import {
  BrowserFields,
  ConfigKey,
  MonitorFields,
  SyntheticsMonitor,
  HeartbeatConfig,
  TLSFields,
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
  ConfigKey.ALERT_CONFIG,
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

  if (!config[ConfigKey.METADATA]?.is_tls_enabled) {
    const sslKeys = Object.keys(formattedMonitor).filter((key) =>
      key.includes('ssl')
    ) as unknown as Array<keyof TLSFields>;
    sslKeys.forEach((key) => (formattedMonitor[key] = null));
  }

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
  heartbeatId,
  runOnce,
  testRunId,
  params: globalParams,
}: {
  monitor: SyntheticsMonitor;
  monitorId: string;
  heartbeatId: string;
  runOnce?: boolean;
  testRunId?: string;
  params: Record<string, string>;
}): HeartbeatConfig => {
  const projectId = (monitor as BrowserFields)[ConfigKey.PROJECT_ID];

  let params = { ...(globalParams ?? {}) };

  let paramsString = '';

  try {
    const monParamsStr = (monitor as BrowserFields)[ConfigKey.PARAMS];

    if (monParamsStr) {
      const monitorParams = JSON.parse(monParamsStr);
      params = { ...params, ...monitorParams };
    }

    paramsString = isEmpty(params) ? '' : JSON.stringify(params);
  } catch (e) {
    // ignore
  }

  return {
    ...monitor,
    id: heartbeatId,
    fields: {
      config_id: monitorId,
      'monitor.project.name': projectId || undefined,
      'monitor.project.id': projectId || undefined,
      run_once: runOnce,
      test_run_id: testRunId,
    },
    fields_under_root: true,
    params: paramsString,
  };
};

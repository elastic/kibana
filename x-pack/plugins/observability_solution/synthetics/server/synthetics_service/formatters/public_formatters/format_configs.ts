/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isNil, omitBy } from 'lodash';
import { Logger } from '@kbn/logging';
import { replaceStringWithParams } from '../formatting_utils';
import { PARAMS_KEYS_TO_SKIP } from '../common';
import {
  BrowserFields,
  ConfigKey,
  HeartbeatConfig,
  MonitorFields,
  SyntheticsMonitor,
  TLSFields,
} from '../../../../common/runtime_types';
import { publicFormatters } from '.';

const UI_KEYS_TO_SKIP = [
  ConfigKey.JOURNEY_ID,
  ConfigKey.PROJECT_ID,
  ConfigKey.METADATA,
  ConfigKey.REVISION,
  ConfigKey.CUSTOM_HEARTBEAT_ID,
  ConfigKey.FORM_MONITOR_TYPE,
  ConfigKey.TEXT_ASSERTION,
  ConfigKey.CONFIG_HASH,
  ConfigKey.ALERT_CONFIG,
  ConfigKey.LABELS,
  'secrets',
];

export const formatMonitorConfigFields = (
  configKeys: ConfigKey[],
  config: Partial<MonitorFields>,
  logger: Logger,
  params: Record<string, string>
) => {
  const formattedMonitor = {} as Record<ConfigKey, any>;

  configKeys.forEach((key) => {
    if (!UI_KEYS_TO_SKIP.includes(key)) {
      const value = config[key] ?? null;

      if (value === null || value === '') {
        return;
      }

      if (config.type !== 'browser' && key === ConfigKey.PARAMS) {
        return;
      }

      if (!!publicFormatters[key]) {
        const formatter = publicFormatters[key];
        if (typeof formatter === 'function') {
          formattedMonitor[key] = formatter(config, key);
        } else {
          formattedMonitor[key] = formatter;
        }
      } else {
        formattedMonitor[key] = value;
      }
    }
    if (!PARAMS_KEYS_TO_SKIP.includes(key)) {
      formattedMonitor[key] = replaceStringWithParams(formattedMonitor[key], params, logger);
    }
  });

  if (!config[ConfigKey.METADATA]?.is_tls_enabled) {
    const sslKeys = Object.keys(formattedMonitor).filter((key) =>
      key.includes('ssl')
    ) as unknown as Array<keyof TLSFields>;
    sslKeys.forEach((key) => (formattedMonitor[key] = null));
  }

  return omitBy(formattedMonitor, isNil) as Partial<MonitorFields>;
};

export interface ConfigData {
  monitor: SyntheticsMonitor;
  configId: string;
  heartbeatId?: string;
  runOnce?: boolean;
  testRunId?: string;
  params: Record<string, string>;
  spaceId: string;
}

export const formatHeartbeatRequest = (
  { monitor, configId, heartbeatId, runOnce, testRunId, spaceId }: Omit<ConfigData, 'params'>,
  params?: string
): HeartbeatConfig => {
  const projectId = (monitor as BrowserFields)[ConfigKey.PROJECT_ID];

  const heartbeatIdT = heartbeatId ?? monitor[ConfigKey.MONITOR_QUERY_ID];

  const paramsString = params ?? (monitor as BrowserFields)[ConfigKey.PARAMS];
  const { labels } = monitor;

  return {
    ...monitor,
    id: heartbeatIdT,
    fields: {
      config_id: configId,
      'monitor.project.name': projectId || undefined,
      'monitor.project.id': projectId || undefined,
      run_once: runOnce,
      test_run_id: testRunId,
      meta: {
        space_id: spaceId,
      },
      ...(isEmpty(labels) ? {} : { labels }),
    },
    fields_under_root: true,
    params: monitor.type === 'browser' ? paramsString : '',
  };
};

export const mixParamsWithGlobalParams = (
  globalParams: Record<string, string>,
  monitor: SyntheticsMonitor
) => {
  let params: Record<string, string> = { ...(globalParams ?? {}) };

  const paramsString = '';

  try {
    const monParamsStr = (monitor as BrowserFields)[ConfigKey.PARAMS];

    if (monParamsStr) {
      const monitorParams = JSON.parse(monParamsStr);
      params = { ...params, ...monitorParams };
    }

    if (!isEmpty(params)) {
      return { str: JSON.stringify(params), params };
    } else {
      return { str: '', params };
    }
  } catch (e) {
    // ignore
  }

  return { str: paramsString, params };
};

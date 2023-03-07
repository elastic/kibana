/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields, ConfigKey, MonitorFields } from '../../runtime_types/monitor_management';

export type Formatter = null | ((fields: Partial<MonitorFields>) => string | null);

export type CommonFormatMap = Record<keyof CommonFields | ConfigKey.NAME, Formatter>;

export const commonFormatters: CommonFormatMap = {
  [ConfigKey.NAME]: null,
  [ConfigKey.LOCATIONS]: null,
  [ConfigKey.MONITOR_TYPE]: null,
  [ConfigKey.ENABLED]: null,
  [ConfigKey.ALERT_CONFIG]: null,
  [ConfigKey.CONFIG_ID]: null,
  [ConfigKey.SCHEDULE]: (fields) =>
    JSON.stringify(
      `@every ${fields[ConfigKey.SCHEDULE]?.number}${fields[ConfigKey.SCHEDULE]?.unit}`
    ),
  [ConfigKey.APM_SERVICE_NAME]: null,
  [ConfigKey.TAGS]: (fields) => arrayToJsonFormatter(fields[ConfigKey.TAGS]),
  [ConfigKey.TIMEOUT]: (fields) => secondsToCronFormatter(fields[ConfigKey.TIMEOUT] || undefined),
  [ConfigKey.NAMESPACE]: null,
  [ConfigKey.REVISION]: null,
  [ConfigKey.MONITOR_SOURCE_TYPE]: null,
  [ConfigKey.FORM_MONITOR_TYPE]: null,
  [ConfigKey.JOURNEY_ID]: null,
  [ConfigKey.PROJECT_ID]: null,
  [ConfigKey.CUSTOM_HEARTBEAT_ID]: null,
  [ConfigKey.ORIGINAL_SPACE]: null,
  [ConfigKey.CONFIG_HASH]: null,
  [ConfigKey.MONITOR_QUERY_ID]: null,
};

export const arrayToJsonFormatter = (value: string[] = []) =>
  value.length ? JSON.stringify(value) : null;

export const secondsToCronFormatter = (value: string = '') => (value ? `${value}s` : null);

export const objectToJsonFormatter = (value: Record<string, any> = {}) =>
  Object.keys(value).length ? JSON.stringify(value) : null;

export const stringToJsonFormatter = (value: string = '') => (value ? JSON.stringify(value) : null);

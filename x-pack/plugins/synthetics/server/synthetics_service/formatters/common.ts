/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields, ConfigKey, MonitorFields, SourceType } from '../../../common/runtime_types';

export type FormattedValue = boolean | string | string[] | Record<string, unknown> | null;

export type Formatter = null | ((fields: Partial<MonitorFields>) => FormattedValue);

export type CommonFormatMap = Record<keyof CommonFields, Formatter>;

export const commonFormatters: CommonFormatMap = {
  [ConfigKey.NAME]: null,
  [ConfigKey.LOCATIONS]: null,
  [ConfigKey.ENABLED]: null,
  [ConfigKey.ALERT_CONFIG]: null,
  [ConfigKey.MONITOR_TYPE]: null,
  [ConfigKey.CONFIG_ID]: null,
  [ConfigKey.LOCATIONS]: null,
  [ConfigKey.SCHEDULE]: (fields) =>
    `@every ${fields[ConfigKey.SCHEDULE]?.number}${fields[ConfigKey.SCHEDULE]?.unit}`,
  [ConfigKey.APM_SERVICE_NAME]: null,
  [ConfigKey.TAGS]: (fields) => arrayFormatter(fields[ConfigKey.TAGS]),
  [ConfigKey.TIMEOUT]: (fields) => secondsToCronFormatter(fields[ConfigKey.TIMEOUT] || undefined),
  [ConfigKey.NAMESPACE]: null,
  [ConfigKey.REVISION]: null,
  [ConfigKey.MONITOR_SOURCE_TYPE]: (fields) =>
    fields[ConfigKey.MONITOR_SOURCE_TYPE] || SourceType.UI,
  [ConfigKey.FORM_MONITOR_TYPE]: null,
  [ConfigKey.JOURNEY_ID]: null,
  [ConfigKey.PROJECT_ID]: null,
  [ConfigKey.CUSTOM_HEARTBEAT_ID]: null,
  [ConfigKey.ORIGINAL_SPACE]: null,
  [ConfigKey.CONFIG_HASH]: null,
  [ConfigKey.MONITOR_QUERY_ID]: null,
};

export const arrayFormatter = (value: string[] = []) => (value.length ? value : null);

export const secondsToCronFormatter = (value: string = '') => (value ? `${value}s` : null);

export const objectFormatter = (value: Record<string, any> = {}) =>
  Object.keys(value).length ? value : null;

export const stringToObjectFormatter = (value: string) => {
  try {
    const obj = JSON.parse(value || '{}');
    return Object.keys(obj).length ? obj : undefined;
  } catch {
    return undefined;
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields, ConfigKey, MonitorFields } from '../../../../common/runtime_types';

export type FormattedValue = boolean | string | string[] | Record<string, string> | null;

export type Formatter = null | ((fields: Partial<MonitorFields>) => FormattedValue);

export type CommonFormatMap = Record<keyof CommonFields, Formatter>;

export const commonFormatters: CommonFormatMap = {
  [ConfigKey.NAME]: null,
  [ConfigKey.LOCATIONS]: null,
  [ConfigKey.ENABLED]: null,
  [ConfigKey.MONITOR_TYPE]: null,
  [ConfigKey.LOCATIONS]: null,
  [ConfigKey.SCHEDULE]: (fields) =>
    `@every ${fields[ConfigKey.SCHEDULE]?.number}${fields[ConfigKey.SCHEDULE]?.unit}`,
  [ConfigKey.APM_SERVICE_NAME]: null,
  [ConfigKey.TAGS]: (fields) => arrayFormatter(fields[ConfigKey.TAGS]),
  [ConfigKey.TIMEOUT]: (fields) => secondsToCronFormatter(fields[ConfigKey.TIMEOUT] || undefined),
  [ConfigKey.NAMESPACE]: null,
  [ConfigKey.REVISION]: null,
};

export const arrayFormatter = (value: string[] = []) => (value.length ? value : null);

export const secondsToCronFormatter = (value: string = '') => (value ? `${value}s` : null);

export const objectFormatter = (value: Record<string, any> = {}) =>
  Object.keys(value).length ? value : null;

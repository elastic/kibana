/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields, ConfigKey, SourceType } from '../../runtime_types/monitor_management';
import { arrayToJsonFormatter, FormatterFn } from '../formatting_utils';

export type Formatter = null | FormatterFn;

export type CommonFormatMap = Record<keyof CommonFields | ConfigKey.NAME, Formatter>;

export const commonFormatters: CommonFormatMap = {
  [ConfigKey.APM_SERVICE_NAME]: null,
  [ConfigKey.NAME]: null,
  [ConfigKey.LOCATIONS]: null,
  [ConfigKey.MONITOR_TYPE]: null,
  [ConfigKey.ENABLED]: null,
  [ConfigKey.ALERT_CONFIG]: null,
  [ConfigKey.CONFIG_ID]: null,
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
  [ConfigKey.PARAMS]: null,
  [ConfigKey.SCHEDULE]: (fields) =>
    JSON.stringify(
      `@every ${fields[ConfigKey.SCHEDULE]?.number}${fields[ConfigKey.SCHEDULE]?.unit}`
    ),
  [ConfigKey.TAGS]: arrayToJsonFormatter,
  [ConfigKey.TIMEOUT]: (fields) => secondsToCronFormatter(fields[ConfigKey.TIMEOUT] || undefined),
  [ConfigKey.MONITOR_SOURCE_TYPE]: (fields) =>
    fields[ConfigKey.MONITOR_SOURCE_TYPE] || SourceType.UI,
};

export const secondsToCronFormatter = (value: string = '') => (value ? `${value}s` : null);

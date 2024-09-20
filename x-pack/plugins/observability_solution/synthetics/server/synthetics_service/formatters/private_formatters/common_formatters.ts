/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields, ConfigKey, SourceType } from '../../../../common/runtime_types';
import {
  arrayToJsonFormatter,
  stringToJsonFormatter,
  FormatterFn,
  secondsToCronFormatter,
} from './formatting_utils';

export type Formatter = null | FormatterFn;

export type CommonFormatMap = Record<keyof CommonFields | ConfigKey.NAME, Formatter>;

export const commonFormatters: CommonFormatMap = {
  [ConfigKey.APM_SERVICE_NAME]: stringToJsonFormatter,
  [ConfigKey.NAME]: stringToJsonFormatter,
  [ConfigKey.LOCATIONS]: null,
  [ConfigKey.MONITOR_TYPE]: null,
  [ConfigKey.ENABLED]: null,
  [ConfigKey.ALERT_CONFIG]: null,
  [ConfigKey.CONFIG_ID]: null,
  [ConfigKey.NAMESPACE]: null,
  [ConfigKey.REVISION]: null,
  [ConfigKey.MONITOR_SOURCE_TYPE]: null,
  [ConfigKey.FORM_MONITOR_TYPE]: null,
  [ConfigKey.LABELS]: null,
  [ConfigKey.JOURNEY_ID]: stringToJsonFormatter,
  [ConfigKey.PROJECT_ID]: stringToJsonFormatter,
  [ConfigKey.CUSTOM_HEARTBEAT_ID]: stringToJsonFormatter,
  [ConfigKey.ORIGINAL_SPACE]: stringToJsonFormatter,
  [ConfigKey.CONFIG_HASH]: null,
  [ConfigKey.MONITOR_QUERY_ID]: stringToJsonFormatter,
  [ConfigKey.PARAMS]: null,
  [ConfigKey.MAX_ATTEMPTS]: null,
  retest_on_failure: null,
  [ConfigKey.SCHEDULE]: (fields) =>
    JSON.stringify(
      `@every ${fields[ConfigKey.SCHEDULE]?.number}${fields[ConfigKey.SCHEDULE]?.unit}`
    ),
  [ConfigKey.TAGS]: arrayToJsonFormatter,
  [ConfigKey.TIMEOUT]: secondsToCronFormatter,
  // @ts-expect-error upgrade typescript v5.1.6
  [ConfigKey.MONITOR_SOURCE_TYPE]: (fields) =>
    fields[ConfigKey.MONITOR_SOURCE_TYPE] || SourceType.UI,
};

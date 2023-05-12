/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { secondsToCronFormatter } from '../private_formatters/common/formatters';
import {
  arrayToJsonFormatter,
  stringToJsonFormatter,
} from '../private_formatters/formatting_utils';
import { arrayFormatter, stringToObjectFormatter } from './formatting_utils';
import {
  CommonFields,
  ConfigKey,
  MonitorFields,
  SourceType,
} from '../../../../common/runtime_types';

export type FormattedValue =
  | boolean
  | number
  | string
  | string[]
  | Record<string, unknown>
  | null
  | Function;

export type Formatter =
  | null
  | ((fields: Partial<MonitorFields>, key: ConfigKey) => FormattedValue)
  | Function;

export type CommonFormatMap = Record<keyof CommonFields, Formatter>;
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
  [ConfigKey.JOURNEY_ID]: stringToJsonFormatter,
  [ConfigKey.PROJECT_ID]: stringToJsonFormatter,
  [ConfigKey.CUSTOM_HEARTBEAT_ID]: stringToJsonFormatter,
  [ConfigKey.ORIGINAL_SPACE]: stringToJsonFormatter,
  [ConfigKey.CONFIG_HASH]: null,
  [ConfigKey.MONITOR_QUERY_ID]: stringToJsonFormatter,
  [ConfigKey.PARAMS]: null,
  [ConfigKey.SCHEDULE]: (fields) =>
    JSON.stringify(
      `@every ${fields[ConfigKey.SCHEDULE]?.number}${fields[ConfigKey.SCHEDULE]?.unit}`
    ),
  [ConfigKey.TAGS]: arrayToJsonFormatter,
  [ConfigKey.TIMEOUT]: (fields) => secondsToCronFormatter(fields[ConfigKey.TIMEOUT] || undefined),
  [ConfigKey.MONITOR_SOURCE_TYPE]: (fields) =>
    fields[ConfigKey.MONITOR_SOURCE_TYPE] || SourceType.UI,
  [ConfigKey.PARAMS]: stringToObjectFormatter,
  [ConfigKey.SCHEDULE]: (fields) =>
    `@every ${fields[ConfigKey.SCHEDULE]?.number}${fields[ConfigKey.SCHEDULE]?.unit}`,
  [ConfigKey.TAGS]: arrayFormatter,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { arrayFormatter, stringToObjectFormatter } from './formatting_utils';
import { commonFormatters as commonBasicFormatters } from '../../../common/formatters/common/formatters';
import { CommonFields, ConfigKey, MonitorFields } from '../../../common/runtime_types';

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
  ...commonBasicFormatters,
  [ConfigKey.PARAMS]: stringToObjectFormatter,
  [ConfigKey.SCHEDULE]: (fields) =>
    `@every ${fields[ConfigKey.SCHEDULE]?.number}${fields[ConfigKey.SCHEDULE]?.unit}`,
  [ConfigKey.TAGS]: arrayFormatter,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserFields, ConfigKeys } from '../types';
import {
  Formatter,
  commonFormatters,
  arrayToJsonFormatter,
  stringToJsonFormatter,
} from '../common/formatters';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

export const browserFormatters: BrowserFormatMap = {
  [ConfigKeys.SOURCE_ZIP_URL]: null,
  [ConfigKeys.SOURCE_ZIP_USERNAME]: null,
  [ConfigKeys.SOURCE_ZIP_PASSWORD]: null,
  [ConfigKeys.SOURCE_ZIP_FOLDER]: null,
  [ConfigKeys.SOURCE_INLINE]: (fields) => stringToJsonFormatter(fields[ConfigKeys.SOURCE_INLINE]),
  [ConfigKeys.PARAMS]: null,
  [ConfigKeys.SCREENSHOTS]: null,
  [ConfigKeys.SYNTHETICS_ARGS]: (fields) =>
    arrayToJsonFormatter(fields[ConfigKeys.SYNTHETICS_ARGS]),
  ...commonFormatters,
};

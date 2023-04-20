/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BrowserFields, ConfigKey } from '../../runtime_types/monitor_management';

import { Formatter, commonFormatters } from '../common/formatters';
import {
  arrayToJsonFormatter,
  objectToJsonFormatter,
  stringToJsonFormatter,
} from '../formatting_utils';

import { tlsFormatters } from '../tls/formatters';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

export const throttlingFormatter: Formatter = (fields) => {
  const throttling = fields[ConfigKey.THROTTLING_CONFIG];

  if (!throttling || throttling?.id === 'no-throttling' || !throttling?.value) {
    return 'false';
  }

  return `${throttling.value.download}d/${throttling.value.upload}u/${throttling.value.latency}l`;
};

export const browserFormatters: BrowserFormatMap = {
  [ConfigKey.SOURCE_PROJECT_CONTENT]: null,
  [ConfigKey.PARAMS]: null,
  [ConfigKey.SCREENSHOTS]: null,
  [ConfigKey.IGNORE_HTTPS_ERRORS]: null,
  [ConfigKey.PLAYWRIGHT_OPTIONS]: null,
  [ConfigKey.TEXT_ASSERTION]: null,
  [ConfigKey.PORT]: null,
  [ConfigKey.URLS]: null,
  [ConfigKey.METADATA]: objectToJsonFormatter,
  [ConfigKey.SOURCE_INLINE]: stringToJsonFormatter,
  [ConfigKey.SYNTHETICS_ARGS]: arrayToJsonFormatter,
  [ConfigKey.JOURNEY_FILTERS_MATCH]: stringToJsonFormatter,
  [ConfigKey.JOURNEY_FILTERS_TAGS]: arrayToJsonFormatter,
  [ConfigKey.THROTTLING_CONFIG]: throttlingFormatter,
  ...commonFormatters,
  ...tlsFormatters,
};

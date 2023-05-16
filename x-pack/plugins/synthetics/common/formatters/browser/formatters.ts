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
import { DEFAULT_THROTTLING_VALUE } from '../../constants/monitor_defaults';

import { tlsFormatters } from '../tls/formatters';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

export const throttlingFormatter: Formatter = (fields) => {
  const throttling = fields[ConfigKey.THROTTLING_CONFIG];

  if (!throttling || throttling?.id === 'no-throttling' || !throttling?.value) {
    return 'false';
  }

  return JSON.stringify({
    download: Number(throttling?.value?.download || DEFAULT_THROTTLING_VALUE.download),
    upload: Number(throttling?.value?.upload || DEFAULT_THROTTLING_VALUE.upload),
    latency: Number(throttling?.value?.latency || DEFAULT_THROTTLING_VALUE),
  });
};

export const browserFormatters: BrowserFormatMap = {
  [ConfigKey.SOURCE_PROJECT_CONTENT]: null,
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

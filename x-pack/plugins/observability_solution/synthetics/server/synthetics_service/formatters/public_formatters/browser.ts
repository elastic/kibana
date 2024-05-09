/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_BROWSER_ADVANCED_FIELDS } from '../../../../common/constants/monitor_defaults';
import { BrowserFields, ConfigKey } from '../../../../common/runtime_types';
import { Formatter, commonFormatters } from './common';
import { tlsFormatters } from './tls';
import { arrayFormatter, objectFormatter, stringToObjectFormatter } from './formatting_utils';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

export const throttlingFormatter: Formatter = (fields) => {
  const value = fields[ConfigKey.THROTTLING_CONFIG];
  const defaultThrottling = DEFAULT_BROWSER_ADVANCED_FIELDS[ConfigKey.THROTTLING_CONFIG].value;

  const thValue = value?.value;

  if (!thValue || !defaultThrottling) return false;

  if (thValue?.download === '0' && thValue?.upload === '0' && thValue?.latency === '0')
    return false;
  if (value?.label === 'no-throttling') return false;

  return {
    download: Number(thValue?.download ?? defaultThrottling.download),
    upload: Number(thValue?.upload ?? defaultThrottling.upload),
    latency: Number(thValue?.latency ?? defaultThrottling.latency),
  };
};

export const browserFormatters: BrowserFormatMap = {
  ...commonFormatters,
  ...tlsFormatters,
  [ConfigKey.SOURCE_PROJECT_CONTENT]: null,
  [ConfigKey.SCREENSHOTS]: null,
  [ConfigKey.IGNORE_HTTPS_ERRORS]: null,
  [ConfigKey.TEXT_ASSERTION]: null,
  [ConfigKey.PORT]: null,
  [ConfigKey.URLS]: null,
  [ConfigKey.METADATA]: objectFormatter,
  [ConfigKey.SOURCE_INLINE]: null,
  [ConfigKey.THROTTLING_CONFIG]: throttlingFormatter,
  [ConfigKey.JOURNEY_FILTERS_MATCH]: null,
  [ConfigKey.SYNTHETICS_ARGS]: arrayFormatter,
  [ConfigKey.JOURNEY_FILTERS_TAGS]: arrayFormatter,
  [ConfigKey.PLAYWRIGHT_OPTIONS]: stringToObjectFormatter,
  [ConfigKey.JOURNEY_FILTERS_TAGS]: arrayFormatter,
  [ConfigKey.PLAYWRIGHT_OPTIONS]: stringToObjectFormatter,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { browserFormatters as basicBrowserFormatters } from '../../../common/formatters/browser/formatters';
import { Formatter, commonFormatters } from './common';
import { BrowserFields, ConfigKey } from '../../../common/runtime_types/monitor_management';
import { DEFAULT_BROWSER_ADVANCED_FIELDS } from '../../../common/constants/monitor_defaults';
import { tlsFormatters } from './tls';
import { arrayFormatter, objectFormatter, stringToObjectFormatter } from './formatting_utils';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

const throttlingFormatter: Formatter = (fields) => {
  if (!fields[ConfigKey.IS_THROTTLING_ENABLED]) return false;

  return {
    download: parseInt(
      fields[ConfigKey.DOWNLOAD_SPEED] || DEFAULT_BROWSER_ADVANCED_FIELDS[ConfigKey.DOWNLOAD_SPEED],
      10
    ),
    upload: parseInt(
      fields[ConfigKey.UPLOAD_SPEED] || DEFAULT_BROWSER_ADVANCED_FIELDS[ConfigKey.UPLOAD_SPEED],
      10
    ),
    latency: parseInt(
      fields[ConfigKey.LATENCY] || DEFAULT_BROWSER_ADVANCED_FIELDS[ConfigKey.LATENCY],
      10
    ),
  };
};

export const browserFormatters: BrowserFormatMap = {
  ...basicBrowserFormatters,
  [ConfigKey.METADATA]: objectFormatter,
  [ConfigKey.SOURCE_INLINE]: null,
  [ConfigKey.THROTTLING_CONFIG]: throttlingFormatter,
  [ConfigKey.JOURNEY_FILTERS_MATCH]: null,
  [ConfigKey.SYNTHETICS_ARGS]: arrayFormatter,
  [ConfigKey.JOURNEY_FILTERS_TAGS]: arrayFormatter,
  [ConfigKey.PARAMS]: stringToObjectFormatter,
  [ConfigKey.PLAYWRIGHT_OPTIONS]: stringToObjectFormatter,
  ...commonFormatters,
  ...tlsFormatters,
};

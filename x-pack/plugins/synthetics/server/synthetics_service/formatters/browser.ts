/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Formatter, commonFormatters, objectFormatter, arrayFormatter } from './common';
import { BrowserFields, ConfigKey } from '../../../common/runtime_types/monitor_management';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

const throttlingFormatter: Formatter = (fields) => {
  if (!fields[ConfigKey.IS_THROTTLING_ENABLED]) return false;

  const getThrottlingValue = (v: string | undefined, suffix: 'd' | 'u' | 'l') =>
    v !== '' && v !== undefined ? `${v}${suffix}` : null;

  return [
    getThrottlingValue(fields[ConfigKey.DOWNLOAD_SPEED], 'd'),
    getThrottlingValue(fields[ConfigKey.UPLOAD_SPEED], 'u'),
    getThrottlingValue(fields[ConfigKey.LATENCY], 'l'),
  ]
    .filter((v) => v !== null)
    .join('/');
};

export const browserFormatters: BrowserFormatMap = {
  [ConfigKey.METADATA]: (fields) => objectFormatter(fields[ConfigKey.METADATA]),
  [ConfigKey.URLS]: null,
  [ConfigKey.PORT]: null,
  [ConfigKey.ZIP_URL_TLS_VERSION]: (fields) =>
    arrayFormatter(fields[ConfigKey.ZIP_URL_TLS_VERSION]),
  [ConfigKey.SOURCE_ZIP_URL]: null,
  [ConfigKey.SOURCE_ZIP_USERNAME]: null,
  [ConfigKey.SOURCE_ZIP_PASSWORD]: null,
  [ConfigKey.SOURCE_ZIP_FOLDER]: null,
  [ConfigKey.SOURCE_ZIP_PROXY_URL]: null,
  [ConfigKey.SOURCE_INLINE]: null,
  [ConfigKey.PARAMS]: null,
  [ConfigKey.SCREENSHOTS]: null,
  [ConfigKey.SYNTHETICS_ARGS]: (fields) => arrayFormatter(fields[ConfigKey.SYNTHETICS_ARGS]),
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: null,
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: null,
  [ConfigKey.ZIP_URL_TLS_KEY]: null,
  [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: null,
  [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: null,
  [ConfigKey.IS_THROTTLING_ENABLED]: null,
  [ConfigKey.THROTTLING_CONFIG]: (fields) => throttlingFormatter(fields),
  [ConfigKey.DOWNLOAD_SPEED]: null,
  [ConfigKey.UPLOAD_SPEED]: null,
  [ConfigKey.LATENCY]: null,
  [ConfigKey.JOURNEY_FILTERS_MATCH]: null,
  [ConfigKey.JOURNEY_FILTERS_TAGS]: (fields) =>
    arrayFormatter(fields[ConfigKey.JOURNEY_FILTERS_TAGS]),
  [ConfigKey.IGNORE_HTTPS_ERRORS]: null,
  ...commonFormatters,
};

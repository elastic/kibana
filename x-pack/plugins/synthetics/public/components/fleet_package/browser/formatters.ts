/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserFields, ConfigKey } from '../types';
import {
  Formatter,
  commonFormatters,
  objectToJsonFormatter,
  arrayToJsonFormatter,
  stringToJsonFormatter,
} from '../common/formatters';
import {
  tlsValueToYamlFormatter,
  tlsValueToStringFormatter,
  tlsArrayToYamlFormatter,
} from '../tls/formatters';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

const throttlingFormatter: Formatter = (fields) => {
  if (!fields[ConfigKey.IS_THROTTLING_ENABLED]) return 'false';

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
  [ConfigKey.METADATA]: (fields) => objectToJsonFormatter(fields[ConfigKey.METADATA]),
  [ConfigKey.URLS]: null,
  [ConfigKey.PORT]: null,
  [ConfigKey.SOURCE_ZIP_URL]: null,
  [ConfigKey.SOURCE_ZIP_USERNAME]: null,
  [ConfigKey.SOURCE_ZIP_PASSWORD]: null,
  [ConfigKey.SOURCE_ZIP_FOLDER]: null,
  [ConfigKey.SOURCE_ZIP_PROXY_URL]: null,
  [ConfigKey.SOURCE_INLINE]: (fields) => stringToJsonFormatter(fields[ConfigKey.SOURCE_INLINE]),
  [ConfigKey.PARAMS]: null,
  [ConfigKey.SCREENSHOTS]: null,
  [ConfigKey.IS_THROTTLING_ENABLED]: null,
  [ConfigKey.DOWNLOAD_SPEED]: null,
  [ConfigKey.UPLOAD_SPEED]: null,
  [ConfigKey.LATENCY]: null,
  [ConfigKey.SYNTHETICS_ARGS]: (fields) => arrayToJsonFormatter(fields[ConfigKey.SYNTHETICS_ARGS]),
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]),
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKey.ZIP_URL_TLS_CERTIFICATE]),
  [ConfigKey.ZIP_URL_TLS_KEY]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKey.ZIP_URL_TLS_KEY]),
  [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: (fields) =>
    tlsValueToStringFormatter(fields[ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]),
  [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: (fields) =>
    tlsValueToStringFormatter(fields[ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]),
  [ConfigKey.ZIP_URL_TLS_VERSION]: (fields) =>
    tlsArrayToYamlFormatter(fields[ConfigKey.ZIP_URL_TLS_VERSION]),
  [ConfigKey.JOURNEY_FILTERS_MATCH]: (fields) =>
    stringToJsonFormatter(fields[ConfigKey.JOURNEY_FILTERS_MATCH]),
  [ConfigKey.JOURNEY_FILTERS_TAGS]: (fields) =>
    arrayToJsonFormatter(fields[ConfigKey.JOURNEY_FILTERS_TAGS]),
  [ConfigKey.THROTTLING_CONFIG]: throttlingFormatter,
  [ConfigKey.IGNORE_HTTPS_ERRORS]: null,
  ...commonFormatters,
};

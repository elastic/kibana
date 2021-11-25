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
  if (!fields[ConfigKeys.IS_THROTTLING_ENABLED]) return 'false';

  const getThrottlingValue = (v: string | undefined, suffix: 'd' | 'u' | 'l') =>
    v !== '' && v !== undefined ? `${v}${suffix}` : null;

  return [
    getThrottlingValue(fields[ConfigKeys.DOWNLOAD_SPEED], 'd'),
    getThrottlingValue(fields[ConfigKeys.UPLOAD_SPEED], 'u'),
    getThrottlingValue(fields[ConfigKeys.LATENCY], 'l'),
  ]
    .filter((v) => v !== null)
    .join('/');
};

export const browserFormatters: BrowserFormatMap = {
  [ConfigKeys.METADATA]: (fields) => objectToJsonFormatter(fields[ConfigKeys.METADATA]),
  [ConfigKeys.SOURCE_ZIP_URL]: null,
  [ConfigKeys.SOURCE_ZIP_USERNAME]: null,
  [ConfigKeys.SOURCE_ZIP_PASSWORD]: null,
  [ConfigKeys.SOURCE_ZIP_FOLDER]: null,
  [ConfigKeys.SOURCE_ZIP_PROXY_URL]: null,
  [ConfigKeys.SOURCE_INLINE]: (fields) => stringToJsonFormatter(fields[ConfigKeys.SOURCE_INLINE]),
  [ConfigKeys.PARAMS]: null,
  [ConfigKeys.SCREENSHOTS]: null,
  [ConfigKeys.IS_THROTTLING_ENABLED]: null,
  [ConfigKeys.DOWNLOAD_SPEED]: null,
  [ConfigKeys.UPLOAD_SPEED]: null,
  [ConfigKeys.LATENCY]: null,
  [ConfigKeys.SYNTHETICS_ARGS]: (fields) =>
    arrayToJsonFormatter(fields[ConfigKeys.SYNTHETICS_ARGS]),
  [ConfigKeys.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKeys.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]),
  [ConfigKeys.ZIP_URL_TLS_CERTIFICATE]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKeys.ZIP_URL_TLS_CERTIFICATE]),
  [ConfigKeys.ZIP_URL_TLS_KEY]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKeys.ZIP_URL_TLS_KEY]),
  [ConfigKeys.ZIP_URL_TLS_KEY_PASSPHRASE]: (fields) =>
    tlsValueToStringFormatter(fields[ConfigKeys.ZIP_URL_TLS_KEY_PASSPHRASE]),
  [ConfigKeys.ZIP_URL_TLS_VERIFICATION_MODE]: (fields) =>
    tlsValueToStringFormatter(fields[ConfigKeys.ZIP_URL_TLS_VERIFICATION_MODE]),
  [ConfigKeys.ZIP_URL_TLS_VERSION]: (fields) =>
    tlsArrayToYamlFormatter(fields[ConfigKeys.ZIP_URL_TLS_VERSION]),
  [ConfigKeys.JOURNEY_FILTERS_MATCH]: (fields) =>
    stringToJsonFormatter(fields[ConfigKeys.JOURNEY_FILTERS_MATCH]),
  [ConfigKeys.JOURNEY_FILTERS_TAGS]: (fields) =>
    arrayToJsonFormatter(fields[ConfigKeys.JOURNEY_FILTERS_TAGS]),
  [ConfigKeys.THROTTLING_CONFIG]: throttlingFormatter,
  [ConfigKeys.IGNORE_HTTPS_ERRORS]: null,
  ...commonFormatters,
};

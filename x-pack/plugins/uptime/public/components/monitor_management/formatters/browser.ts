/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserFields, ConfigKey } from '../../fleet_package/types';
import { Formatter, commonFormatters, objectFormatter, arrayFormatter } from './common';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

export const browserFormatters: BrowserFormatMap = {
  [ConfigKey.METADATA]: (fields) => objectFormatter(fields[ConfigKey.METADATA]),
  [ConfigKey.SOURCE_ZIP_URL]: null,
  [ConfigKey.SOURCE_ZIP_USERNAME]: null,
  [ConfigKey.SOURCE_ZIP_PASSWORD]: null,
  [ConfigKey.SOURCE_ZIP_FOLDER]: null,
  [ConfigKey.SOURCE_ZIP_PROXY_URL]: null,
  [ConfigKey.SOURCE_INLINE]: null,
  [ConfigKey.PARAMS]: null,
  [ConfigKey.SCREENSHOTS]: null,
  [ConfigKey.SYNTHETICS_ARGS]: (fields) => null,
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: null,
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: null,
  [ConfigKey.ZIP_URL_TLS_KEY]: null,
  [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: null,
  [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: null,
  [ConfigKey.IS_THROTTLING_ENABLED]: null,
  [ConfigKey.THROTTLING_CONFIG]: null,
  [ConfigKey.DOWNLOAD_SPEED]: null,
  [ConfigKey.UPLOAD_SPEED]: null,
  [ConfigKey.LATENCY]: null,
  [ConfigKey.ZIP_URL_TLS_VERSION]: (fields) =>
    arrayFormatter(fields[ConfigKey.ZIP_URL_TLS_VERSION]),
  [ConfigKey.JOURNEY_FILTERS_MATCH]: null,
  [ConfigKey.JOURNEY_FILTERS_TAGS]: null,
  [ConfigKey.IGNORE_HTTPS_ERRORS]: null,
  ...commonFormatters,
};

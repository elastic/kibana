/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserFields, ConfigKeys } from '../../fleet_package/types';
import { Formatter, commonFormatters, objectFormatter, arrayFormatter } from './common';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

export const browserFormatters: BrowserFormatMap = {
  [ConfigKeys.METADATA]: (fields) => objectFormatter(fields[ConfigKeys.METADATA]),
  [ConfigKeys.SOURCE_ZIP_URL]: null,
  [ConfigKeys.SOURCE_ZIP_USERNAME]: null,
  [ConfigKeys.SOURCE_ZIP_PASSWORD]: null,
  [ConfigKeys.SOURCE_ZIP_FOLDER]: null,
  [ConfigKeys.SOURCE_ZIP_PROXY_URL]: null,
  [ConfigKeys.SOURCE_INLINE]: null,
  [ConfigKeys.PARAMS]: null,
  [ConfigKeys.SCREENSHOTS]: null,
  [ConfigKeys.SYNTHETICS_ARGS]: (fields) => null,
  [ConfigKeys.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: null,
  [ConfigKeys.ZIP_URL_TLS_CERTIFICATE]: null,
  [ConfigKeys.ZIP_URL_TLS_KEY]: null,
  [ConfigKeys.ZIP_URL_TLS_KEY_PASSPHRASE]: null,
  [ConfigKeys.ZIP_URL_TLS_VERIFICATION_MODE]: null,
  [ConfigKeys.ZIP_URL_TLS_VERSION]: (fields) =>
    arrayFormatter(fields[ConfigKeys.ZIP_URL_TLS_VERSION]),
  [ConfigKeys.JOURNEY_FILTERS_MATCH]: null,
  [ConfigKeys.JOURNEY_FILTERS_TAGS]: null,
  [ConfigKeys.IGNORE_HTTPS_ERRORS]: null,
  ...commonFormatters,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserFields, ConfigKey } from '../types';
import {
  Normalizer,
  commonNormalizers,
  getNormalizer,
  getJsonToJavascriptNormalizer,
} from '../common/normalizers';

import { defaultBrowserSimpleFields, defaultBrowserAdvancedFields } from '../contexts';

export type BrowserNormalizerMap = Record<keyof BrowserFields, Normalizer>;

const defaultBrowserFields = {
  ...defaultBrowserSimpleFields,
  ...defaultBrowserAdvancedFields,
};

export const getBrowserNormalizer = (key: ConfigKey) => {
  return getNormalizer(key, defaultBrowserFields);
};

export const getBrowserJsonToJavascriptNormalizer = (key: ConfigKey) => {
  return getJsonToJavascriptNormalizer(key, defaultBrowserFields);
};

export const browserNormalizers: BrowserNormalizerMap = {
  [ConfigKey.METADATA]: getBrowserJsonToJavascriptNormalizer(ConfigKey.METADATA),
  [ConfigKey.SOURCE_ZIP_URL]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_URL),
  [ConfigKey.SOURCE_ZIP_USERNAME]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_USERNAME),
  [ConfigKey.SOURCE_ZIP_PASSWORD]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_PASSWORD),
  [ConfigKey.SOURCE_ZIP_FOLDER]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_FOLDER),
  [ConfigKey.SOURCE_INLINE]: getBrowserJsonToJavascriptNormalizer(ConfigKey.SOURCE_INLINE),
  [ConfigKey.SOURCE_ZIP_PROXY_URL]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_PROXY_URL),
  [ConfigKey.PARAMS]: getBrowserNormalizer(ConfigKey.PARAMS),
  [ConfigKey.SCREENSHOTS]: getBrowserNormalizer(ConfigKey.SCREENSHOTS),
  [ConfigKey.SYNTHETICS_ARGS]: getBrowserJsonToJavascriptNormalizer(ConfigKey.SYNTHETICS_ARGS),
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: getBrowserJsonToJavascriptNormalizer(
    ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES
  ),
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: getBrowserJsonToJavascriptNormalizer(
    ConfigKey.ZIP_URL_TLS_CERTIFICATE
  ),
  [ConfigKey.ZIP_URL_TLS_KEY]: getBrowserJsonToJavascriptNormalizer(ConfigKey.ZIP_URL_TLS_KEY),
  [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: getBrowserNormalizer(
    ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE
  ),
  [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: getBrowserNormalizer(
    ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE
  ),
  [ConfigKey.ZIP_URL_TLS_VERSION]: getBrowserJsonToJavascriptNormalizer(
    ConfigKey.ZIP_URL_TLS_VERSION
  ),
  [ConfigKey.JOURNEY_FILTERS_MATCH]: getBrowserJsonToJavascriptNormalizer(
    ConfigKey.JOURNEY_FILTERS_MATCH
  ),
  [ConfigKey.JOURNEY_FILTERS_TAGS]: getBrowserJsonToJavascriptNormalizer(
    ConfigKey.JOURNEY_FILTERS_TAGS
  ),
  [ConfigKey.IGNORE_HTTPS_ERRORS]: getBrowserNormalizer(ConfigKey.IGNORE_HTTPS_ERRORS),
  ...commonNormalizers,
};

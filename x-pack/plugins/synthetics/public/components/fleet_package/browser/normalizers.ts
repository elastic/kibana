/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BrowserFields,
  ConfigKey,
  ThrottlingSuffix,
  ThrottlingConfigKey,
  configKeyToThrottlingSuffix,
} from '../types';
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

export function throttlingToParameterNormalizer(
  suffix: ThrottlingSuffix,
  throttlingConfigValue?: string
): unknown {
  if (!throttlingConfigValue || throttlingConfigValue === 'false') return null;
  return (
    throttlingConfigValue
      .split('/')
      .filter((p) => p.endsWith(suffix))[0]
      ?.slice(0, -1) ?? null
  );
}

export const isThrottlingEnabledNormalizer: Normalizer = function isThrottlingEnabledNormalizer(
  fields
) {
  const throttlingEnabled = fields?.[ConfigKey.THROTTLING_CONFIG]?.value;

  // If we have any value that's not an explicit "false" it means throttling is "on"
  return throttlingEnabled !== 'false';
};

export function getThrottlingParamNormalizer(key: ThrottlingConfigKey): Normalizer {
  const paramSuffix = configKeyToThrottlingSuffix[key];
  return (fields) =>
    throttlingToParameterNormalizer(paramSuffix, fields?.[ConfigKey.THROTTLING_CONFIG]?.value) ??
    defaultBrowserFields[key];
}

export const browserNormalizers: BrowserNormalizerMap = {
  [ConfigKey.METADATA]: getBrowserJsonToJavascriptNormalizer(ConfigKey.METADATA),
  [ConfigKey.URLS]: getBrowserNormalizer(ConfigKey.URLS),
  [ConfigKey.PORT]: getBrowserNormalizer(ConfigKey.PORT),
  [ConfigKey.SOURCE_ZIP_URL]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_URL),
  [ConfigKey.SOURCE_ZIP_USERNAME]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_USERNAME),
  [ConfigKey.SOURCE_ZIP_PASSWORD]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_PASSWORD),
  [ConfigKey.SOURCE_ZIP_FOLDER]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_FOLDER),
  [ConfigKey.SOURCE_INLINE]: getBrowserJsonToJavascriptNormalizer(ConfigKey.SOURCE_INLINE),
  [ConfigKey.SOURCE_ZIP_PROXY_URL]: getBrowserNormalizer(ConfigKey.SOURCE_ZIP_PROXY_URL),
  [ConfigKey.PARAMS]: getBrowserNormalizer(ConfigKey.PARAMS),
  [ConfigKey.SCREENSHOTS]: getBrowserNormalizer(ConfigKey.SCREENSHOTS),
  [ConfigKey.SYNTHETICS_ARGS]: getBrowserJsonToJavascriptNormalizer(ConfigKey.SYNTHETICS_ARGS),
  [ConfigKey.IS_THROTTLING_ENABLED]: isThrottlingEnabledNormalizer,
  [ConfigKey.DOWNLOAD_SPEED]: getThrottlingParamNormalizer(ConfigKey.DOWNLOAD_SPEED),
  [ConfigKey.UPLOAD_SPEED]: getThrottlingParamNormalizer(ConfigKey.UPLOAD_SPEED),
  [ConfigKey.LATENCY]: getThrottlingParamNormalizer(ConfigKey.LATENCY),
  [ConfigKey.THROTTLING_CONFIG]: getBrowserNormalizer(ConfigKey.THROTTLING_CONFIG),
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

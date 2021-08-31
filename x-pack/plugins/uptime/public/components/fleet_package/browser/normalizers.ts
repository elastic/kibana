/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserFields, ConfigKeys } from '../types';
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

export const getBrowserNormalizer = (key: ConfigKeys) => {
  return getNormalizer(key, defaultBrowserFields);
};

export const getBrowserJsonToJavascriptNormalizer = (key: ConfigKeys) => {
  return getJsonToJavascriptNormalizer(key, defaultBrowserFields);
};

export const browserNormalizers: BrowserNormalizerMap = {
  [ConfigKeys.SOURCE_ZIP_URL]: getBrowserNormalizer(ConfigKeys.SOURCE_ZIP_URL),
  [ConfigKeys.SOURCE_ZIP_USERNAME]: getBrowserNormalizer(ConfigKeys.SOURCE_ZIP_USERNAME),
  [ConfigKeys.SOURCE_ZIP_PASSWORD]: getBrowserNormalizer(ConfigKeys.SOURCE_ZIP_PASSWORD),
  [ConfigKeys.SOURCE_ZIP_FOLDER]: getBrowserNormalizer(ConfigKeys.SOURCE_ZIP_FOLDER),
  [ConfigKeys.SOURCE_INLINE]: getBrowserJsonToJavascriptNormalizer(ConfigKeys.SOURCE_INLINE),
  [ConfigKeys.PARAMS]: getBrowserNormalizer(ConfigKeys.PARAMS),
  [ConfigKeys.SCREENSHOTS]: getBrowserNormalizer(ConfigKeys.SCREENSHOTS),
  [ConfigKeys.SYNTHETICS_ARGS]: getBrowserJsonToJavascriptNormalizer(ConfigKeys.SYNTHETICS_ARGS),
  ...commonNormalizers,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserFields, ConfigKeys } from '../types';
import { Normalizer, commonNormalizers } from '../common/normalizers';

import { defaultBrowserSimpleFields } from '../contexts';

export type BrowserNormalizerMap = Record<keyof BrowserFields, Normalizer>;

export const browserNormalizers: BrowserNormalizerMap = {
  [ConfigKeys.SOURCE_ZIP_URL]: (fields) =>
    fields?.[ConfigKeys.SOURCE_ZIP_URL]?.value ??
    defaultBrowserSimpleFields[ConfigKeys.SOURCE_ZIP_URL],
  [ConfigKeys.SOURCE_ZIP_USERNAME]: (fields) =>
    fields?.[ConfigKeys.SOURCE_ZIP_USERNAME]?.value ??
    defaultBrowserSimpleFields[ConfigKeys.SOURCE_ZIP_USERNAME],
  [ConfigKeys.SOURCE_ZIP_PASSWORD]: (fields) =>
    fields?.[ConfigKeys.SOURCE_ZIP_PASSWORD]?.value ??
    defaultBrowserSimpleFields[ConfigKeys.SOURCE_ZIP_PASSWORD],
  [ConfigKeys.SOURCE_ZIP_FOLDER]: (fields) =>
    fields?.[ConfigKeys.SOURCE_ZIP_FOLDER]?.value ??
    defaultBrowserSimpleFields[ConfigKeys.SOURCE_ZIP_FOLDER],
  [ConfigKeys.SOURCE_INLINE]: (fields) =>
    fields?.[ConfigKeys.SOURCE_INLINE]?.value ??
    defaultBrowserSimpleFields[ConfigKeys.SOURCE_INLINE],
  [ConfigKeys.PARAMS]: (fields) =>
    fields?.[ConfigKeys.PARAMS]?.value ?? defaultBrowserSimpleFields[ConfigKeys.PARAMS],
  ...commonNormalizers,
};

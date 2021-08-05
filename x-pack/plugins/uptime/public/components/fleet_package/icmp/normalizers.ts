/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICMPFields, ConfigKeys } from '../types';
import { Normalizer, commonNormalizers, cronToSecondsNormalizer } from '../common/normalizers';
import { defaultICMPSimpleFields } from '../contexts';

export type ICMPNormalizerMap = Record<keyof ICMPFields, Normalizer>;

export const icmpNormalizers: ICMPNormalizerMap = {
  [ConfigKeys.HOSTS]: (fields) =>
    fields?.[ConfigKeys.HOSTS]?.value ?? defaultICMPSimpleFields[ConfigKeys.HOSTS],
  [ConfigKeys.WAIT]: (fields) =>
    cronToSecondsNormalizer(fields?.[ConfigKeys.WAIT]?.value) ??
    defaultICMPSimpleFields[ConfigKeys.WAIT],
  ...commonNormalizers,
};

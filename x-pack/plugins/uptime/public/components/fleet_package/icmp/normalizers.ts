/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICMPFields, ConfigKeys } from '../types';
import {
  Normalizer,
  commonNormalizers,
  getNormalizer,
  getCronNormalizer,
} from '../common/normalizers';
import { defaultICMPSimpleFields } from '../contexts';

export type ICMPNormalizerMap = Record<keyof ICMPFields, Normalizer>;

export const getICMPNormalizer = (key: ConfigKeys) => {
  return getNormalizer(key, defaultICMPSimpleFields);
};

export const getICMPCronToSecondsNormalizer = (key: ConfigKeys) => {
  return getCronNormalizer(key, defaultICMPSimpleFields);
};

export const icmpNormalizers: ICMPNormalizerMap = {
  [ConfigKeys.HOSTS]: getICMPNormalizer(ConfigKeys.HOSTS),
  [ConfigKeys.WAIT]: getICMPCronToSecondsNormalizer(ConfigKeys.WAIT),
  ...commonNormalizers,
};

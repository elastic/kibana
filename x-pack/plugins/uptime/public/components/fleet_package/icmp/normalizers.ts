/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICMPFields, ConfigKey } from '../types';
import {
  Normalizer,
  commonNormalizers,
  getNormalizer,
  getCronNormalizer,
} from '../common/normalizers';
import { defaultICMPSimpleFields } from '../contexts';

export type ICMPNormalizerMap = Record<keyof ICMPFields, Normalizer>;

export const getICMPNormalizer = (key: ConfigKey) => {
  return getNormalizer(key, defaultICMPSimpleFields);
};

export const getICMPCronToSecondsNormalizer = (key: ConfigKey) => {
  return getCronNormalizer(key, defaultICMPSimpleFields);
};

export const icmpNormalizers: ICMPNormalizerMap = {
  [ConfigKey.HOSTS]: getICMPNormalizer(ConfigKey.HOSTS),
  [ConfigKey.WAIT]: getICMPCronToSecondsNormalizer(ConfigKey.WAIT),
  ...commonNormalizers,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields, ConfigKey } from '../types';
import { NewPackagePolicyInput } from '../../../../../fleet/common';
import { defaultValues as commonDefaultValues } from './default_values';
import { DEFAULT_NAMESPACE_STRING } from '../../../../common/constants';

// TO DO: create a standard input format that all fields resolve to
export type Normalizer = (fields: NewPackagePolicyInput['vars']) => unknown;

// create a type of all the common policy fields, as well as the fleet managed 'name' field
export type CommonNormalizerMap = Record<keyof CommonFields | ConfigKey.NAME, Normalizer>;

/**
 * Takes a cron formatted seconds and returns just the number of seconds. Assumes that cron is already in seconds format.
 * @params {string} value (Ex '3s')
 * @return {string} (Ex '3')
 */
export const cronToSecondsNormalizer = (value: string) =>
  value ? value.slice(0, value.length - 1) : null;

export const jsonToJavascriptNormalizer = (value: string) => (value ? JSON.parse(value) : null);

export function getNormalizer<Fields>(key: string, defaultValues: Fields): Normalizer {
  return (fields: NewPackagePolicyInput['vars']) =>
    fields?.[key]?.value ?? defaultValues[key as keyof Fields];
}

export function getJsonToJavascriptNormalizer<Fields>(
  key: string,
  defaultValues: Fields
): Normalizer {
  return (fields: NewPackagePolicyInput['vars']) =>
    jsonToJavascriptNormalizer(fields?.[key]?.value) ?? defaultValues[key as keyof Fields];
}

export function getCronNormalizer<Fields>(key: string, defaultValues: Fields): Normalizer {
  return (fields: NewPackagePolicyInput['vars']) =>
    cronToSecondsNormalizer(fields?.[key]?.value) ?? defaultValues[key as keyof Fields];
}

export const getCommonNormalizer = (key: ConfigKey) => {
  return getNormalizer(key, commonDefaultValues);
};

export const getCommonjsonToJavascriptNormalizer = (key: ConfigKey) => {
  return getJsonToJavascriptNormalizer(key, commonDefaultValues);
};

export const getCommonCronToSecondsNormalizer = (key: ConfigKey) => {
  return getCronNormalizer(key, commonDefaultValues);
};

export const commonNormalizers: CommonNormalizerMap = {
  [ConfigKey.NAME]: (fields) => fields?.[ConfigKey.NAME]?.value ?? '',
  [ConfigKey.LOCATIONS]: getCommonNormalizer(ConfigKey.LOCATIONS),
  [ConfigKey.ENABLED]: getCommonNormalizer(ConfigKey.ENABLED),
  [ConfigKey.MONITOR_TYPE]: getCommonNormalizer(ConfigKey.MONITOR_TYPE),
  [ConfigKey.LOCATIONS]: getCommonNormalizer(ConfigKey.LOCATIONS),
  [ConfigKey.SCHEDULE]: (fields) => {
    const value = fields?.[ConfigKey.SCHEDULE]?.value;
    if (value) {
      const fullString = JSON.parse(fields?.[ConfigKey.SCHEDULE]?.value);
      const fullSchedule = fullString.replace('@every ', '');
      const unit = fullSchedule.slice(-1);
      const number = fullSchedule.slice(0, fullSchedule.length - 1);
      return {
        unit,
        number,
      };
    } else {
      return commonDefaultValues[ConfigKey.SCHEDULE];
    }
  },
  [ConfigKey.APM_SERVICE_NAME]: getCommonNormalizer(ConfigKey.APM_SERVICE_NAME),
  [ConfigKey.TAGS]: getCommonjsonToJavascriptNormalizer(ConfigKey.TAGS),
  [ConfigKey.TIMEOUT]: getCommonCronToSecondsNormalizer(ConfigKey.TIMEOUT),
  [ConfigKey.NAMESPACE]: (fields) =>
    fields?.[ConfigKey.NAMESPACE]?.value ?? DEFAULT_NAMESPACE_STRING,
  [ConfigKey.REVISION]: getCommonNormalizer(ConfigKey.REVISION),
};

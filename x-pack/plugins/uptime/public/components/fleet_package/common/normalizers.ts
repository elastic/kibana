/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICommonFields, ConfigKeys } from '../types';
import { NewPackagePolicyInput } from '../../../../../fleet/common';
import { defaultValues as commonDefaultValues } from './default_values';

// TO DO: create a standard input format that all fields resolve to
export type Normalizer = (fields: NewPackagePolicyInput['vars']) => unknown;

// create a type of all the common policy fields, as well as the fleet managed 'name' field
export type CommonNormalizerMap = Record<keyof ICommonFields | ConfigKeys.NAME, Normalizer>;

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

export const getCommonNormalizer = (key: ConfigKeys) => {
  return getNormalizer(key, commonDefaultValues);
};

export const getCommonjsonToJavascriptNormalizer = (key: ConfigKeys) => {
  return getJsonToJavascriptNormalizer(key, commonDefaultValues);
};

export const getCommonCronToSecondsNormalizer = (key: ConfigKeys) => {
  return getCronNormalizer(key, commonDefaultValues);
};

export const commonNormalizers: CommonNormalizerMap = {
  [ConfigKeys.NAME]: (fields) => fields?.[ConfigKeys.NAME]?.value ?? '',
  [ConfigKeys.MONITOR_TYPE]: getCommonNormalizer(ConfigKeys.MONITOR_TYPE),
  [ConfigKeys.SCHEDULE]: (fields) => {
    const value = fields?.[ConfigKeys.SCHEDULE]?.value;
    if (value) {
      const fullString = JSON.parse(fields?.[ConfigKeys.SCHEDULE]?.value);
      const fullSchedule = fullString.replace('@every ', '');
      const unit = fullSchedule.slice(-1);
      const number = fullSchedule.slice(0, fullSchedule.length - 1);
      return {
        unit,
        number,
      };
    } else {
      return commonDefaultValues[ConfigKeys.SCHEDULE];
    }
  },
  [ConfigKeys.APM_SERVICE_NAME]: getCommonNormalizer(ConfigKeys.APM_SERVICE_NAME),
  [ConfigKeys.TAGS]: getCommonjsonToJavascriptNormalizer(ConfigKeys.TAGS),
  [ConfigKeys.TIMEOUT]: getCommonCronToSecondsNormalizer(ConfigKeys.TIMEOUT),
};

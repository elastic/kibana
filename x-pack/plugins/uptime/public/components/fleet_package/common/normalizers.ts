/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICommonFields, ConfigKeys } from '../types';
import { NewPackagePolicyInput } from '../../../../../fleet/common';
import { defaultValues } from './default_values';

// TO DO: create a standard input format that all fields resolve to
export type Normalizer = (fields: NewPackagePolicyInput['vars']) => unknown;

// create a type of all the common policy fields, as well as the fleet managed 'name' field
export type CommonNormalizerMap = Record<keyof ICommonFields | ConfigKeys.NAME, Normalizer>;

export const commonNormalizers: CommonNormalizerMap = {
  [ConfigKeys.NAME]: (fields) => fields?.[ConfigKeys.NAME]?.value ?? '',
  [ConfigKeys.MONITOR_TYPE]: (fields) =>
    fields?.[ConfigKeys.MONITOR_TYPE]?.value ?? defaultValues[ConfigKeys.MONITOR_TYPE],
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
      return defaultValues[ConfigKeys.SCHEDULE];
    }
  },
  [ConfigKeys.APM_SERVICE_NAME]: (fields) =>
    fields?.[ConfigKeys.APM_SERVICE_NAME]?.value ?? defaultValues[ConfigKeys.APM_SERVICE_NAME],
  [ConfigKeys.TAGS]: (fields) =>
    yamlToArrayOrObjectNormalizer(fields?.[ConfigKeys.TAGS]?.value) ??
    defaultValues[ConfigKeys.TAGS],
  [ConfigKeys.TIMEOUT]: (fields) =>
    cronToSecondsNormalizer(fields?.[ConfigKeys.TIMEOUT]?.value) ??
    defaultValues[ConfigKeys.TIMEOUT],
};

export const cronToSecondsNormalizer = (value: string) =>
  value ? value.slice(0, value.length - 1) : null;

export const yamlToArrayOrObjectNormalizer = (value: string) => (value ? JSON.parse(value) : null);

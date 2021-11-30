/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICommonFields, ICustomFields, ConfigKeys } from '../../fleet_package/types';

export type Formatter =
  | null
  | ((fields: Partial<ICustomFields>) => string | string[] | Record<string, string> | null);

export type CommonFormatMap = Record<keyof ICommonFields | ConfigKeys.NAME, Formatter>;

export const commonFormatters: CommonFormatMap = {
  [ConfigKeys.NAME]: null,
  [ConfigKeys.MONITOR_TYPE]: null,
  [ConfigKeys.SCHEDULE]: (fields) =>
    `@every ${fields[ConfigKeys.SCHEDULE]?.number}${fields[ConfigKeys.SCHEDULE]?.unit}`,
  [ConfigKeys.APM_SERVICE_NAME]: null,
  [ConfigKeys.TAGS]: null,
  [ConfigKeys.TIMEOUT]: (fields) => secondsToCronFormatter(fields[ConfigKeys.TIMEOUT]),
};

export const arrayFormatter = (value: string[] = []) => (value.length ? value : null);

export const secondsToCronFormatter = (value: string = '') => (value ? `${value}s` : null);

export const objectFormatter = (value: Record<string, any> = {}) =>
  Object.keys(value).length ? value : null;

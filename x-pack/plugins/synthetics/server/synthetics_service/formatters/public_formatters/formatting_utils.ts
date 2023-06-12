/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, MonitorFields } from '../../../../common/runtime_types';

type FormatterFn = (
  fields: Partial<MonitorFields>,
  key: ConfigKey
) => string | null | Record<string, any> | string[];

export const arrayFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as string[]) ?? [];

  return value.length ? value : null;
};

export const objectFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as Record<string, any>) ?? {};

  return Object.keys(value).length ? value : null;
};

export const stringToObjectFormatter: FormatterFn = (fields, key) => {
  const value = fields[key] as string;
  try {
    const obj = JSON.parse(value || '{}');
    return Object.keys(obj).length ? obj : undefined;
  } catch {
    return undefined;
  }
};

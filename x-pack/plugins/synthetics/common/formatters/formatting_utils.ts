/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceVarsWithParams, ParsedVars } from './lightweight_param_formatter';
import variableParser from './variable_parser';
import { ConfigKey, MonitorFields } from '../runtime_types';

export type FormatterFn = (fields: Partial<MonitorFields>, key: ConfigKey) => string | null;

export const arrayToJsonFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as string[]) ?? [];
  return value.length ? JSON.stringify(value) : null;
};

export const objectToJsonFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as Record<string, any>) ?? {};

  return Object.keys(value).length ? JSON.stringify(value) : null;
};

// only add tls settings if they are enabled by the user and isEnabled is true
export const tlsValueToYamlFormatter: FormatterFn = (fields, key) => {
  if (fields[ConfigKey.METADATA]?.is_tls_enabled) {
    const tlsValue = (fields[key] as string) ?? '';

    return tlsValue ? JSON.stringify(tlsValue) : null;
  } else {
    return null;
  }
};

export const tlsValueToStringFormatter: FormatterFn = (fields, key) => {
  if (fields[ConfigKey.METADATA]?.is_tls_enabled) {
    const tlsValue = (fields[key] as string) ?? '';

    return tlsValue || null;
  } else {
    return null;
  }
};

export const tlsArrayToYamlFormatter: FormatterFn = (fields, key) => {
  if (fields[ConfigKey.METADATA]?.is_tls_enabled) {
    const tlsValue = (fields[key] as string[]) ?? [];

    return tlsValue.length ? JSON.stringify(tlsValue) : null;
  } else {
    return null;
  }
};

export const stringToJsonFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as string) ?? '';

  return value ? JSON.stringify(value) : null;
};

export const paramReplaceFormatter = (fields: Partial<MonitorFields>, key: ConfigKey) => {
  if (fields.type === 'browser') {
    return fields[key] as string | null;
  }

  const value = fields[key] ?? null;

  if (!value) {
    return value as string | null;
  }

  let paramsObj: Record<string, string> = {};

  try {
    const { params } = fields;
    paramsObj = params ? JSON.parse(params) : {};
  } catch (e) {
    return value as string | null;
  }

  const parsedVars: ParsedVars = variableParser.parse(value as string);

  return replaceVarsWithParams(parsedVars, paramsObj);
};

export const secondsToCronFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as string) ?? '';

  return value ? `${value}s` : null;
};

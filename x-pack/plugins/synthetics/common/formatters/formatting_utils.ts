/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { replaceVarsWithParams, ParsedVars } from './lightweight_param_formatter';
import variableParser from './variable_parser';
import { ConfigKey, MonitorFields } from '../runtime_types';

export type FormatterFn = (fields: Partial<MonitorFields>, key: ConfigKey) => string | null;

export const arrayToJsonFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as string[]) ?? [];
  return value.length ? JSON.stringify(value) : null;
};

export const objectToJsonFormatter: FormatterFn = (fields, fieldKey) => {
  const value = (fields[fieldKey] as Record<string, any>) ?? {};
  if (Object.keys(value).length === 0) return null;

  return JSON.stringify(value);
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

export const replaceStringWithParams = (
  value: string | boolean | {} | [],
  params: Record<string, string>,
  logger?: Logger
) => {
  if (!value || typeof value === 'boolean') {
    return value as string | null;
  }

  try {
    if (typeof value !== 'string') {
      const strValue = JSON.stringify(value);
      const parsedVars: ParsedVars = variableParser.parse(strValue);

      const parseValue = replaceVarsWithParams(parsedVars, params);
      return JSON.parse(parseValue);
    }

    const parsedVars: ParsedVars = variableParser.parse(value);

    return replaceVarsWithParams(parsedVars, params);
  } catch (e) {
    logger?.error(`error parsing vars for value ${JSON.stringify(value)}, ${e}`);
  }

  return value as string | null;
};

export const secondsToCronFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as string) ?? '';

  return value ? `${value}s` : null;
};

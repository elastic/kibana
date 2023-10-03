/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ConfigKey, MonitorFields } from '../../../common/runtime_types';
import { ParsedVars, replaceVarsWithParams } from './lightweight_param_formatter';
import variableParser from './variable_parser';

export type FormatterFn = (
  fields: Partial<MonitorFields>,
  key: ConfigKey
) => string | number | null;

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
      if (hasNoParams(strValue)) {
        return value as string | null;
      }

      const parsedVars: ParsedVars = variableParser.parse(strValue);

      const parseValue = replaceVarsWithParams(parsedVars, params);
      return JSON.parse(parseValue);
    }
    if (hasNoParams(value)) {
      return value as string | null;
    }

    const parsedVars: ParsedVars = variableParser.parse(value);

    return replaceVarsWithParams(parsedVars, params);
  } catch (e) {
    logger?.error(`error parsing vars for value ${JSON.stringify(value)}, ${e}`);
  }

  return value as string | null;
};

export const hasNoParams = (strVal: string) => {
  const shellParamsRegex = /\$\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;
  return strVal.match(shellParamsRegex) === null;
};

export const secondsToCronFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as string) ?? '';

  return value ? `${value}s` : null;
};

export const maxAttemptsFormatter: FormatterFn = (fields, key) => {
  return (fields[key] as number) ?? 2;
};

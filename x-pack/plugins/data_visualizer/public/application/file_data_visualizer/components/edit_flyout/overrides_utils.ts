/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldsFromGrokPattern } from '../../../common/util/grok_pattern';
import { CUSTOM_DROPDOWN_OPTION } from './options/option_lists';

export const LINES_TO_SAMPLE_VALUE_MIN = 3;
export const LINES_TO_SAMPLE_VALUE_MAX = 1000000;

// Some delimiter characters cannot be used as items in select list.
// so show a textual description of the character instead.
export function convertDelimiter(d: string) {
  switch (d) {
    case ',':
      return {
        delimiter: 'comma',
      };
    case '\t':
      return {
        delimiter: 'tab',
      };
    case ';':
      return {
        delimiter: 'semicolon',
      };
    case '|':
      return {
        delimiter: 'pipe',
      };
    case ' ':
      return {
        delimiter: 'space',
      };

    default:
      return {
        delimiter: CUSTOM_DROPDOWN_OPTION,
        customDelimiter: d,
      };
  }
}

// Convert the delimiter textual descriptions back to their real characters.
export function convertDelimiterBack(delimiter: string, customDelimiter: string) {
  switch (delimiter) {
    case 'comma':
      return ',';
    case 'tab':
      return '\t';
    case 'semicolon':
      return ';';
    case 'pipe':
      return '|';
    case 'space':
      return ' ';
    case CUSTOM_DROPDOWN_OPTION:
      return customDelimiter;

    default:
      return undefined;
  }
}

export function getColumnNames(columnNames: string | undefined, originalSettings: any) {
  const newColumnNames =
    columnNames === undefined && originalSettings.columnNames !== undefined
      ? [...originalSettings.columnNames]
      : columnNames;

  const originalColumnNames = newColumnNames !== undefined ? [...newColumnNames] : [];

  return {
    newColumnNames,
    originalColumnNames,
  };
}

export function getGrokFieldNames(grokPattern: string, originalGrokPattern: string) {
  if (originalGrokPattern === undefined) {
    return [];
  }

  if (grokPattern === undefined) {
    return getFieldsFromGrokPattern(originalGrokPattern).map((f) => f.name);
  }

  return getFieldsFromGrokPattern(grokPattern).map((f) => f.name);
}

export function isLinesToSampleValid(linesToSample: number) {
  return linesToSample > LINES_TO_SAMPLE_VALUE_MIN && linesToSample <= LINES_TO_SAMPLE_VALUE_MAX;
}

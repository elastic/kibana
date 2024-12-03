/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash/fp';
import type { OriginalRule } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { SPL_RULES_COLUMNS } from '../../../../constants';
import * as i18n from './translations';

type SplunkResult = Partial<Record<(typeof SPL_RULES_COLUMNS)[number], string>>;
interface SplunkRow {
  result: SplunkResult;
}

export const parseContent = (fileContent: string): OriginalRule[] => {
  const trimmedContent = fileContent.trim();
  let arrayContent: SplunkRow[];
  if (trimmedContent.startsWith('[')) {
    arrayContent = parseJSONArray(trimmedContent);
  } else {
    arrayContent = parseNDJSON(trimmedContent);
  }
  if (arrayContent.length === 0) {
    throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.EMPTY);
  }
  return arrayContent.map(convertFormat);
};

const parseNDJSON = (fileContent: string): SplunkRow[] => {
  return fileContent
    .split(/\n(?=\{)/) // split at newline followed by '{'.
    .filter((entry) => entry.trim() !== '') // Remove empty entries.
    .map((entry) => JSON.parse(entry)); // Parse each entry as JSON.
};

const parseJSONArray = (fileContent: string): SplunkRow[] => {
  let parsedContent: SplunkResult;
  try {
    parsedContent = JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.TOO_LARGE_TO_PARSE);
    }
    throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.CAN_NOT_PARSE);
  }
  if (!Array.isArray(parsedContent)) {
    throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.NOT_ARRAY);
  }
  return parsedContent;
};

const convertFormat = (row: SplunkRow): OriginalRule => {
  if (!isPlainObject(row) || !isPlainObject(row.result)) {
    throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.NOT_OBJECT);
  }
  const originalRule: Partial<OriginalRule> = {
    id: row.result.id,
    vendor: 'splunk',
    title: row.result.title,
    query: row.result.search,
    query_language: 'spl',
    description: row.result['action.escu.eli5'] || row.result.description,
  };

  if (row.result['action.correlationsearch.annotations']) {
    try {
      originalRule.annotations = JSON.parse(row.result['action.correlationsearch.annotations']);
    } catch (error) {
      delete originalRule.annotations;
    }
  }
  return originalRule as OriginalRule;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash/fp';
import type { CriticalityLevels } from '../../../../common/entity_analytics/asset_criticality';
import { MAX_FILE_LINES, VALID_CRITICALITY_LEVELS } from './constants';

export const validateParsedContent = (
  data: string[][]
): { valid: string[][]; invalid: string[][]; error?: string } => {
  if (data.length === 0) {
    return { valid: [], invalid: [], error: 'The file is empty' };
  }

  // validate colum count
  if (data.length > MAX_FILE_LINES) {
    return { valid: [], invalid: [], error: 'The file has too many lines. Max lines is 10.000' };
  }

  const [valid, invalid] = partition(validateLine, data);

  return { valid, invalid };
};

const validateLine = (data: string[]) =>
  data.length === 2 &&
  VALID_CRITICALITY_LEVELS.includes(data[1].toLowerCase() as CriticalityLevels);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CriticalityLevels } from './constants';
import { ValidCriticalityLevels } from './constants';
import type { AssetCriticalityUpsert, CriticalityLevel } from './types';

interface ValidRecord {
  valid: true;
  record: AssetCriticalityUpsert;
}
interface InvalidRecord {
  valid: false;
  error: string;
}

type ReturnType = ValidRecord | InvalidRecord;

export const isErrorResult = (result: ReturnType): result is InvalidRecord => {
  return !result.valid;
};

export const parseAssetCriticalityCsvRow = (row: string[]): ReturnType => {
  if (row.length !== 3) {
    return { valid: false, error: `Missing row data, expected 3 columns got ${row.length}` };
  }

  const [entityType, idValue, criticalityLevel] = row;

  if (!entityType) {
    return { valid: false, error: 'Missing entity type' };
  }

  if (!idValue) {
    return { valid: false, error: 'Missing ID' };
  }

  if (!criticalityLevel) {
    return { valid: false, error: 'Missing criticality level' };
  }

  if (!isValidCriticalityLevel(criticalityLevel)) {
    return { valid: false, error: `Invalid criticality level ${criticalityLevel}` };
  }

  if (entityType !== 'host' && entityType !== 'user') {
    return { valid: false, error: `Invalid entity type ${entityType}` };
  }

  const idField = entityType === 'host' ? 'host.name' : 'user.name';

  return {
    valid: true,
    record: {
      idField,
      idValue,
      criticalityLevel,
    },
  };
};

const isValidCriticalityLevel = (
  criticalityLevel: string
): criticalityLevel is CriticalityLevel => {
  return ValidCriticalityLevels.includes(criticalityLevel as CriticalityLevels);
};

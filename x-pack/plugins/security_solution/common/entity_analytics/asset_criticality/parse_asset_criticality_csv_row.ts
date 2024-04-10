/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CriticalityLevels } from './constants';
import { ValidCriticalityLevels } from './constants';
import type { AssetCriticalityUpsert, CriticalityLevel } from './types';

const MAX_COLUMN_CHARS = 1000;

interface ValidRecord {
  valid: true;
  record: AssetCriticalityUpsert;
}
interface InvalidRecord {
  valid: false;
  error: string;
}

const validationErrorWithMessage = (message: string): InvalidRecord => {
  return {
    valid: false,
    error: message,
  };
};

type ReturnType = ValidRecord | InvalidRecord;

export const isErrorResult = (result: ReturnType): result is InvalidRecord => {
  return !result.valid;
};

const trimColumn = (column: string): string => {
  return column.length > MAX_COLUMN_CHARS ? `${column.substring(0, MAX_COLUMN_CHARS)}...` : column;
};

export const parseAssetCriticalityCsvRow = (row: string[]): ReturnType => {
  if (row.length !== 3) {
    return validationErrorWithMessage(
      i18n.translate('xpack.securitySolution.assetCriticality.csvUpload.expectedColumnsError', {
        defaultMessage: 'Expected 3 columns, got {rowLength}',
        values: { rowLength: row.length },
      })
    );
  }

  const [entityType, idValue, criticalityLevel] = row;

  if (!entityType) {
    return validationErrorWithMessage(
      i18n.translate('xpack.securitySolution.assetCriticality.csvUpload.missingEntityTypeError', {
        defaultMessage: 'Missing entity type',
      })
    );
  }

  if (!idValue) {
    return validationErrorWithMessage(
      i18n.translate('xpack.securitySolution.assetCriticality.csvUpload.missingIdError', {
        defaultMessage: 'Missing identifier',
      })
    );
  }

  if (idValue.length > MAX_COLUMN_CHARS) {
    return validationErrorWithMessage(
      i18n.translate('xpack.securitySolution.assetCriticality.csvUpload.idTooLongError', {
        defaultMessage:
          'Identifier is too long, expected less than {maxChars} characters, got {idLength}',
        values: { maxChars: MAX_COLUMN_CHARS, idLength: idValue.length },
      })
    );
  }

  if (!criticalityLevel) {
    return validationErrorWithMessage(
      i18n.translate('xpack.securitySolution.assetCriticality.csvUpload.missingCriticalityError', {
        defaultMessage: 'Missing criticality level',
      })
    );
  }

  const lowerCaseCriticalityLevel = criticalityLevel.toLowerCase();

  if (!isValidCriticalityLevel(lowerCaseCriticalityLevel)) {
    return validationErrorWithMessage(
      i18n.translate('xpack.securitySolution.assetCriticality.csvUpload.invalidCriticalityError', {
        defaultMessage:
          'Invalid criticality level "{criticalityLevel}", expected one of {validLevels}',
        values: {
          criticalityLevel: trimColumn(criticalityLevel),
          validLevels: ValidCriticalityLevels.join(', '),
        },
      })
    );
  }

  if (entityType !== 'host' && entityType !== 'user') {
    return validationErrorWithMessage(
      i18n.translate('xpack.securitySolution.assetCriticality.csvUpload.invalidEntityTypeError', {
        defaultMessage: 'Invalid entity type "{entityType}", expected host or user',
        values: { entityType: trimColumn(entityType) },
      })
    );
  }

  const idField = entityType === 'host' ? 'host.name' : 'user.name';

  return {
    valid: true,
    record: {
      idField,
      idValue,
      criticalityLevel: lowerCaseCriticalityLevel,
    },
  };
};

const isValidCriticalityLevel = (
  criticalityLevel: string
): criticalityLevel is CriticalityLevel => {
  return ValidCriticalityLevels.includes(criticalityLevel as CriticalityLevels);
};

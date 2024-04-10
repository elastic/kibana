/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  CRITICALITY_CSV_MAX_SIZE_BYTES,
  CRITICALITY_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE,
  parseAssetCriticalityCsvRow,
} from '../../../../common/entity_analytics/asset_criticality';
import { SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPES } from './constants';

export interface RowValidationErrors {
  error: string;
  index: number;
}

export const validateParsedContent = (
  data: string[][]
): { valid: string[][]; invalid: string[][]; errors: RowValidationErrors[] } => {
  if (data.length === 0) {
    return { valid: [], invalid: [], errors: [] };
  }

  let errorIndex = 1; // Error index starts from 1 because EuiCodeBlock line numbers start from 1
  const { valid, invalid, errors } = data.reduce<{
    valid: string[][];
    invalid: string[][];
    errors: RowValidationErrors[];
  }>(
    (acc, row) => {
      const parsedRow = parseAssetCriticalityCsvRow(row);
      if (parsedRow.valid) {
        acc.valid.push(row);
      } else {
        acc.invalid.push(row);
        acc.errors.push({ error: parsedRow.error, index: errorIndex });
        errorIndex++;
      }

      return acc;
    },
    { valid: [], invalid: [], errors: [] }
  );

  return { valid, invalid, errors };
};

export const validateFile = (
  file: File,
  formatBytes: (bytes: number) => string
): { valid: false; errorMessage: string } | { valid: true } => {
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.unsupportedFileTypeError',
        {
          defaultMessage: `Invalid file format selected. Please choose a {supportedFileExtensions} file and try again`,
          values: { supportedFileExtensions: SUPPORTED_FILE_EXTENSIONS.join(', ') },
        }
      ),
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.emptyFileErrorMessage',
        {
          defaultMessage: `The selected file is empty.`,
        }
      ),
    };
  }

  if (file.size > CRITICALITY_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.fileSizeExceedsLimitErrorMessage',
        {
          defaultMessage: 'File size {fileSize} exceeds maximum file size of {maxFileSize}',
          values: {
            fileSize: formatBytes(file.size),
            maxFileSize: formatBytes(CRITICALITY_CSV_MAX_SIZE_BYTES),
          },
        }
      ),
    };
  }
  return { valid: true };
};

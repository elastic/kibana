/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { partition } from 'lodash/fp';
import { parseAssetCriticalityCsvRow } from '../../../../common/entity_analytics/asset_criticality';
import { MAX_FILE_SIZE, SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPES } from './constants';

export const validateParsedContent = (
  data: string[][]
): { valid: string[][]; invalid: string[][]; error?: string } => {
  if (data.length === 0) {
    return { valid: [], invalid: [], error: 'The file is empty' };
  }

  const [valid, invalid] = partition((row) => parseAssetCriticalityCsvRow(row).valid, data);

  return { valid, invalid };
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

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.emptyFileErrorMessage',
        {
          defaultMessage: 'File size {fileSize} exceeds maximum file size of {maxFileSize}',
          values: {
            fileSize: formatBytes(file.size),
            maxFileSize: formatBytes(MAX_FILE_SIZE),
          },
        }
      ),
    };
  }
  return { valid: true };
};

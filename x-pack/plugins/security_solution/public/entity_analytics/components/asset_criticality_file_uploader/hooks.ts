/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ParseConfig } from 'papaparse';
import { unparse, parse } from 'papaparse';
import { useCallback } from 'react';
import { useFormatBytes } from '../../../common/components/formatted_bytes';
import type { RowValidationErrors } from './validations';
import { validateParsedContent, validateFile } from './validations';

export interface OnCompleteParams {
  fileName: string;
  validLinesAsText: string;
  invalidLinesAsText: string;
  invalidLinesErrors: RowValidationErrors[];
  validLinesCount: number;
  invalidLinesCount: number;
}

interface UseFileChangeCbParams {
  onError: (errorMessage: string, file: File) => void;
  onComplete: (param: OnCompleteParams) => void;
}

export const useFileValidation = ({ onError, onComplete }: UseFileChangeCbParams) => {
  const formatBytes = useFormatBytes();

  return useCallback(
    (file: File) => {
      const fileValidation = validateFile(file, formatBytes);
      if (!fileValidation.valid) {
        onError(fileValidation.errorMessage, file);
        return;
      }

      const parserConfig: ParseConfig = {
        dynamicTyping: true,
        skipEmptyLines: true,
        complete(parsedFile, returnedFile) {
          if (parsedFile.data.length === 0) {
            onError(
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.assetCriticalityFileUploader.emptyFileError',
                { defaultMessage: 'The file is empty' }
              ),
              file
            );
            return;
          }

          const { invalid, valid, errors } = validateParsedContent(parsedFile.data);
          const validLinesAsText = unparse(valid);
          const invalidLinesAsText = unparse(invalid);

          onComplete({
            fileName: returnedFile?.name ?? '',
            validLinesAsText,
            invalidLinesAsText,
            invalidLinesErrors: errors,
            validLinesCount: valid.length,
            invalidLinesCount: invalid.length,
          });
        },
        error(parserError) {
          onError(parserError.message, file);
        },
      };

      parse(file, parserConfig);
    },
    [formatBytes, onError, onComplete]
  );
};

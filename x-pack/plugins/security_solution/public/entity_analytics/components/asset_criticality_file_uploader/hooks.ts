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
import { useKibana } from '../../../common/lib/kibana/kibana_react';
export interface OnCompleteParams {
  fileName: string;
  fileSize: number;
  processingStartTime: string;
  processingEndTime: string;
  tookMs: number;
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
  const { telemetry } = useKibana().services;

  const onErrorWrapper = useCallback(
    (
      error: {
        message: string;
        code?: string;
      },
      file: File
    ) => {
      telemetry.reportAssetCriticalityFileSelected({
        valid: false,
        errorCode: error.code,
        file: {
          size: file.size,
        },
      });
      onError(error.message, file);
    },
    [onError, telemetry]
  );

  return useCallback(
    (file: File) => {
      const processingStartTime = Date.now();
      const fileValidation = validateFile(file, formatBytes);
      if (!fileValidation.valid) {
        onErrorWrapper(
          {
            message: fileValidation.errorMessage,
            code: fileValidation.code,
          },
          file
        );
        return;
      }

      telemetry.reportAssetCriticalityFileSelected({
        valid: true,
        file: {
          size: file.size,
        },
      });

      const parserConfig: ParseConfig = {
        dynamicTyping: true,
        skipEmptyLines: true,
        complete(parsedFile, returnedFile) {
          if (parsedFile.data.length === 0) {
            onErrorWrapper(
              {
                message: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.assetCriticalityFileUploader.emptyFileError',
                  { defaultMessage: 'The file is empty' }
                ),
              },
              file
            );
            return;
          }

          const { invalid, valid, errors } = validateParsedContent(parsedFile.data);
          const validLinesAsText = unparse(valid);
          const invalidLinesAsText = unparse(invalid);
          const processingEndTime = Date.now();
          const tookMs = processingEndTime - processingStartTime;
          onComplete({
            fileName: returnedFile?.name ?? '',
            fileSize: returnedFile?.size ?? 0,
            processingStartTime: new Date(processingStartTime).toISOString(),
            processingEndTime: new Date(processingEndTime).toISOString(),
            tookMs,
            validLinesAsText,
            invalidLinesAsText,
            invalidLinesErrors: errors,
            validLinesCount: valid.length,
            invalidLinesCount: invalid.length,
          });
        },
        error(parserError) {
          onErrorWrapper({ message: parserError.message }, file);
        },
      };

      parse(file, parserConfig);
    },
    [formatBytes, telemetry, onErrorWrapper, onComplete]
  );
};

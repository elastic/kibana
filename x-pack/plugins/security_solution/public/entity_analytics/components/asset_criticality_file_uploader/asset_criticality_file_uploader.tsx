/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiStepsHorizontal } from '@elastic/eui';
import React, { useReducer } from 'react';
import type { ParseConfig } from 'papaparse';
import Papa from 'papaparse';
import { i18n } from '@kbn/i18n';
import { useFormatBytes } from '../../../common/components/formatted_bytes';
import { AssetCriticalityFilePickerStep } from './components/file_picker_step';
import { AssetCriticalityValidationStep } from './components/validation_step';
import { validateFile, validateParsedContent } from './validations';
import { reducer } from './reducer';
import { getStepStatus } from './helpers';
import { AssetCriticalityResultStep } from './components/result_step';
import { useEntityAnalyticsRoutes } from '../../api/api';

// TODO
// Should we support headers?
// result step UI
// Add the info icon with the error message

// WHAT DO I NEED FROM DESIGN?
// 3. serverless navigation
// 5. Rename steps

export const AssetCriticalityFileUploader: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, { isLoading: false, step: 1 });
  const formatBytes = useFormatBytes();
  const { uploadAssetCriticalityFile } = useEntityAnalyticsRoutes();

  const onFileChange = (fileList: FileList | null) => {
    if (fileList?.length === 0) {
      dispatch({
        type: 'goToStep',
        payload: { step: 1 },
      });
    }

    const file = fileList?.item(0);
    if (file) {
      dispatch({
        type: 'loadingFile',
        payload: { fileName: file.name },
      });

      const fileValidation = validateFile(file, formatBytes);
      if (!fileValidation.valid) {
        dispatch({
          type: 'fileError',
          payload: {
            file,
            message: fileValidation.errorMessage,
          },
        });
        return;
      }

      const parserConfig: ParseConfig = {
        dynamicTyping: true,
        skipEmptyLines: true,
        complete(parsedFile, returnedFile) {
          const { invalid, valid, error } = validateParsedContent(parsedFile.data);

          if (error) {
            dispatch({ type: 'fileError', payload: { message: error, file } });
            return;
          }

          const validLinesAsText = Papa.unparse(valid);
          const invalidLinesAsText = Papa.unparse(invalid);

          dispatch({
            type: 'fileValidated',
            payload: {
              fileName: returnedFile?.name ?? '',
              validLinesAsText,
              invalidLinesAsText,
              validLinesCount: valid.length,
              invalidLinesCount: invalid.length,
            },
          });
        },
        error(parserError) {
          dispatch({ type: 'fileError', payload: { message: parserError.message, file } });
        },
      };

      Papa.parse(file, parserConfig);
    }
  };

  return (
    <div>
      <EuiStepsHorizontal
        size="s"
        steps={[
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.selectFileStepTitle',
              {
                defaultMessage: 'Select a file',
              }
            ),
            status: getStepStatus(1, state.step),
            onClick: () => {
              dispatch({ type: 'goToStep', payload: { step: 1 } });
            },
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.fileValidationStepTitle',
              {
                defaultMessage: 'File validation',
              }
            ),
            status: getStepStatus(2, state.step),
            onClick: () => {
              dispatch({ type: 'goToStep', payload: { step: 2 } });
            },
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.resultsStepTitle',
              {
                defaultMessage: 'Results',
              }
            ),
            status: getStepStatus(3, state.step),
            onClick: () => {},
          },
        ]}
      />
      <EuiSpacer size="l" />

      <div>
        {state.step === 1 && (
          <AssetCriticalityFilePickerStep
            onFileChange={onFileChange}
            isLoading={state.isLoading}
            errorMessage={state.fileError}
          />
        )}

        {state.step === 2 &&
          state.validLinesCount !== undefined &&
          state.invalidLinesCount !== undefined &&
          state.validLinesAsText !== undefined &&
          state.invalidLinesAsText !== undefined && (
            <AssetCriticalityValidationStep
              validLinesCount={state.validLinesCount}
              invalidLinesCount={state.invalidLinesCount}
              validLinesAsText={state.validLinesAsText}
              invalidLinesAsText={state.invalidLinesAsText}
              fileName={state.fileName ?? ''}
              onReturn={() => {
                dispatch({ type: 'goToStep', payload: { step: 1 } });
              }}
              onConfirm={async () => {
                if (state.validLinesAsText) {
                  dispatch({
                    type: 'uploadingFile',
                  });

                  const result = await uploadAssetCriticalityFile(
                    state.validLinesAsText,
                    state.fileName
                  );

                  dispatch({
                    type: 'fileUploaded',
                    payload: result,
                  });
                }
              }}
            />
          )}

        {state.step === 3 && state.fileUploadResponse && (
          <AssetCriticalityResultStep result={state.fileUploadResponse} />
        )}
      </div>
    </div>
  );
};

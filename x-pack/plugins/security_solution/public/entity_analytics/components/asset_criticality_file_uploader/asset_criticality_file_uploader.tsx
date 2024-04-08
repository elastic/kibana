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

export const AssetCriticalityFileUploader: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, { isLoading: false, step: 1 });
  const formatBytes = useFormatBytes();
  const { uploadAssetCriticalityFile } = useEntityAnalyticsRoutes();

  const onFileChange = (fileList: FileList | null) => {
    if (fileList?.length === 0) {
      dispatch({
        type: 'resetState',
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
          if (parsedFile.data.length === 0) {
            dispatch({ type: 'fileError', payload: { message: 'The file is empty', file } }); // TODO i18n
            return;
          }

          const { invalid, valid, errors } = validateParsedContent(parsedFile.data);

          const validLinesAsText = Papa.unparse(valid);
          const invalidLinesAsText = Papa.unparse(invalid);

          dispatch({
            type: 'fileValidated',
            payload: {
              fileName: returnedFile?.name ?? '',
              validLinesAsText,
              invalidLinesAsText,
              invalidLinesErrors: errors,
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
              if (state.step === 2) {
                dispatch({ type: 'resetState' }); // User can only go back to the first step from the second step
              }
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
            onClick: () => {}, // This prevents the user from going back to the previous step
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
              invalidLinesErrors={state.invalidLinesErrors ?? []}
              fileName={state.fileName ?? ''}
              onReturn={() => {
                dispatch({ type: 'resetState' });
              }}
              onConfirm={async () => {
                if (state.validLinesAsText) {
                  dispatch({
                    type: 'uploadingFile',
                  });

                  try {
                    const result = await uploadAssetCriticalityFile(
                      state.validLinesAsText,
                      state.fileName
                    );

                    dispatch({
                      type: 'fileUploaded',
                      payload: { response: result },
                    });
                  } catch (e) {
                    dispatch({
                      type: 'fileUploaded',
                      payload: { errorMessage: e.message },
                    });
                  }
                }
              }}
            />
          )}

        {state.step === 3 && (
          <AssetCriticalityResultStep
            result={state.fileUploadResponse}
            errorMessage={state.fileUploadError}
            validLinesAsText={state.validLinesAsText ?? ''}
            onReturn={() => {
              dispatch({ type: 'resetState' });
            }}
          />
        )}
      </div>
    </div>
  );
};

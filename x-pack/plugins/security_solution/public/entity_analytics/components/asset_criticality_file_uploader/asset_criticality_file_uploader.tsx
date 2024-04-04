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
import { AssetCriticalityFilePickerStep } from './components/file_picker_step';
import { MAX_FILE_LINES, SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPES } from './constants';
import { AssetCriticalityValidationStep } from './components/validation_step';
import { validateParsedContent } from './validations';
import { reducer } from './reducer';
import { getStepStatus } from './helpers';

// TODO
// add a third column
// Should we support headers?
// result step
// api integration

// WHAT DO I NEED FROM DESIGN?
// 1. 3 columns design update
// 2. navigation icon
// 3. serverless navigation
// 4. confirm that the file uploader and step components are ok
// 5. Rename steps

export const AssetCriticalityFileUploader: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, { isLoading: false, step: 1 });

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
        payload: file,
      });
      if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
        dispatch({
          type: 'unsupportedFileType',
          payload: {
            file,
            error: i18n.translate(
              'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.unsupportedFileTypeError',
              {
                defaultMessage: `Invalid file format selected. Please choose a {supportedFileExtensions} file and try again`,
                values: { supportedFileExtensions: SUPPORTED_FILE_EXTENSIONS.join(', ') },
              }
            ),
          },
        });
        return;
      }

      const parserConfig: ParseConfig = {
        preview: MAX_FILE_LINES + 1,
        complete(parsedFile, returnedFile) {
          const { invalid, valid, error } = validateParsedContent(parsedFile.data);

          if (error) {
            dispatch({ type: 'fileValidationError', payload: { error } });
            return;
          }

          dispatch({
            type: 'fileValidated',
            payload: { file: returnedFile, validLines: valid, invalidLines: invalid }, //  textFile, parsedFile
          });
        },
        error(parserError) {
          dispatch({ type: 'parserError', payload: parserError });
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
            title: 'Upload file',
            status: getStepStatus(1, state.step),
            onClick: () => {
              dispatch({ type: 'goToStep', payload: { step: 1 } });
            },
          },
          {
            title: 'File settings',
            status: getStepStatus(2, state.step),
            onClick: () => {
              dispatch({ type: 'goToStep', payload: { step: 2 } });
            },
          },
          {
            title: 'Results',
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
            errorMessage={
              state.parserError?.message ??
              state.unsupportedFileTypeError ??
              state.fileValidationError
            }
          />
        )}

        {state.step === 2 && state.validLines && state.invalidLines && (
          <AssetCriticalityValidationStep
            validLines={state.validLines}
            invalidLines={state.invalidLines}
          />
        )}
      </div>
    </div>
  );
};

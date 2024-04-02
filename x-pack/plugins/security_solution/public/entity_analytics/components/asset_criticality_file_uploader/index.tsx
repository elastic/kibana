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
import { AssetCriticalityFilePickerStep } from './components/file_picker_step';
import { MAX_FILE_LINES, SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPES } from './constants';
import { AssetCriticalityValidationStep } from './components/validation_step';
import { validateParsedContent } from './validations';
import { reducer } from './reducer';

// TODO
// ADD A THIRD COLUMN
// Should we support headers?

export const AssetCriticalityFileUploader: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, { isLoading: false, step: 1 });

  const onFileChange = (fileList: FileList | null) => {
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
            error: `Invalid file format selected. Please choose a ${SUPPORTED_FILE_EXTENSIONS.join(
              ', '
            )} file and try again`,
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
        steps={[
          {
            title: 'Upload file',
            status: 'current',
            onClick: () => {},
          },
          {
            title: 'File settings',
            status: 'disabled',
            onClick: () => {},
          },
          {
            title: 'Results',
            status: 'disabled',
            onClick: () => {},
          },
        ]}
      />
      <EuiSpacer size="l" />

      <div>
        {(!state.validLines || !state.invalidLines) && (
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

        {state.validLines && state.invalidLines && (
          <AssetCriticalityValidationStep
            validLines={state.validLines}
            invalidLines={state.invalidLines}
          />
        )}
      </div>
    </div>
  );
};

// const startedAt = new Date().getTime();
// console.log('TOOK', (new Date().getTime() - startedAt) / 1000);

// const textFile = Papa.unparse(parsedFile.data, {
//   delimiter: parsedFile.meta.delimiter,
//   newline: parsedFile.meta.linebreak,
// });

// STATE DEBUGGER
// console.log('---------state', JSON.stringify(state, null, 2));
// file: action.payload.file,
// invalidLines: action.payload.invalidLines,
// validLines: action.payload.validLines,
// parsedFile: action.payload.parsedFile,
// textFile: action.payload.textFile,

// parsedFile: Papa.ParseResult; textFile: string
// parsedFile?: Papa.ParseResult;
// textFile?: string;

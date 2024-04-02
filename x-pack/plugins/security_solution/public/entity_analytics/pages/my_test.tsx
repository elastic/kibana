/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCodeBlock, EuiFilePicker, EuiSelect, useEuiTheme } from '@elastic/eui';
import React, { useMemo, useReducer } from 'react';
import type { ParseConfig } from 'papaparse';
import Papa from 'papaparse';
import { partition } from 'lodash/fp';
import { css } from '@emotion/react';
import deepEqual from 'fast-deep-equal';
import { CriticalityLevels } from '../../../common/entity_analytics/asset_criticality';
import { downloadBlob } from '../../common/utils/download_blob';

const MAX_LINES = 10000;

const validateParsedContent = (
  data: string[][]
): { valid: string[][]; invalid: string[][]; error?: string } => {
  if (data.length === 0) {
    return { valid: [], invalid: [], error: 'The file is empty' };
  }

  // validate colum count
  if (data.length > MAX_LINES) {
    return { valid: [], invalid: [], error: 'The file has too many lines. Max lines is 10.000' };
  }

  const [valid, invalid] = partition(validateLine, data);

  return { valid, invalid };
};

const validateLine = (data: string[]) => {
  if (data.length !== 2) {
    console.log('Wrong column count', data.length, data);
    return false; // 'Wrong column count';
  }

  if (!Object.values(CriticalityLevels).includes(data[1] as CriticalityLevels)) {
    console.log('Wrong criticality value', Object.values(CriticalityLevels), data[1]);
    return false; // 'Wrong criticality value';
  }
  return true;
};

interface ReducerState {
  parserError?: Papa.ParseError; // Unexpected error that happens when parsing a file
  unsupportedFileTypeError?: string;
  fileValidationError?: string;
  isLoading: boolean;
  file?: File;
  validLines?: string[][];
  invalidLines?: string[][];
  // parsedFile?: Papa.ParseResult;
  // textFile?: string;
}

type ReducerAction =
  | { type: 'loadingFile'; payload: File }
  | {
      type: 'fileValidated';
      payload: { file?: File; invalidLines: string[][]; validLines: string[][] };
    }
  | { type: 'parserError'; payload: Papa.ParseError }
  | { type: 'fileValidationError'; payload: { error: string } }
  | { type: 'unsupportedFileType'; payload: { error: string; file: File } };
// parsedFile: Papa.ParseResult; textFile: string

const SUPPORTED_FILE_TYPES = ['text/csv', 'text/plain', 'text/tab-separated-values'];
const SUPPORTED_FILE_EXTENSIONS = ['CSV', 'TXT', 'TSV'];

const reducer = (state: ReducerState, action: ReducerAction): ReducerState => {
  // console.log('action', action);
  switch (action.type) {
    case 'loadingFile':
      return {
        isLoading: true,
        file: action.payload,
      };
    case 'fileValidated':
      return {
        isLoading: false,

        ...action.payload,
        invalidLines: action.payload.invalidLines,
        validLines: action.payload.validLines,
        // parsedFile: action.payload.parsedFile,
        // textFile: action.payload.textFile,
      };
    case 'parserError':
      return {
        isLoading: false,
        parserError: action.payload,
      };

    case 'unsupportedFileType':
      return {
        isLoading: false,
        file: action.payload.file,
        unsupportedFileTypeError: action.payload.error,
      };

    case 'fileValidationError':
      return {
        isLoading: false,
        // file: action.payload.file,
        fileValidationError: action.payload.error,
      };

    default:
      return state;
  }
};

export const MyTest = () => {
  const { euiTheme } = useEuiTheme();
  const [state, dispatch] = useReducer(reducer, { isLoading: false });

  // console.log(state.file?.type);

  console.log('---------state', JSON.stringify(state, null, 2));

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

      const startedAt = new Date().getTime();

      const parserConfig: ParseConfig = {
        preview: MAX_LINES + 1,
        complete(parsedFile, returnedFile) {
          console.log('TOOK', (new Date().getTime() - startedAt) / 1000);

          // const textFile = Papa.unparse(parsedFile.data, {
          //   delimiter: parsedFile.meta.delimiter,
          //   newline: parsedFile.meta.linebreak,
          // });

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
          console.error('parserError error', parserError);
          dispatch({ type: 'parserError', payload: parserError });
        },
      };

      Papa.parse(file, parserConfig);
    }
  };

  const [validLinesAsText, invalidLinesAsText] = useMemo(
    () => [
      state.validLines && Papa.unparse(state.validLines),
      state.invalidLines &&
        Papa.unparse(
          state.invalidLines.map((line) => (deepEqual(line, ['']) ? ['<EMPTY_LINE>'] : line))
        ),
    ],
    [state.validLines, state.invalidLines]
  );

  return (
    <div>
      <h1>{'Behold the CSV file uploader'}</h1>
      <br />
      <EuiSelect
        options={[
          {
            value: 'host',
            text: 'Host',
          },
          {
            value: 'user',
            text: 'User',
          },
        ]}
        value={'host'}
        onChange={(v) => {
          console.log(v);
        }}
      />
      <br />
      <div>
        {(!state.validLines || !state.invalidLines) && (
          <>
            {'Select a text file:'}
            <br />
            <EuiFilePicker
              id={'my-file-picker'}
              multiple
              initialPromptText="content that appears in the dropzone if no file is attached"
              onChange={onFileChange}
              isInvalid={!!state.parserError || !!state.unsupportedFileTypeError}
              // boolean
              isLoading={state.isLoading}
              // boolean
              // disabled
            />
            <br />
            {state.parserError && <div>{state.parserError.message}</div>}
            {state.unsupportedFileTypeError && <div>{state.unsupportedFileTypeError}</div>}
            {state.fileValidationError && <div>{state.fileValidationError}</div>}
          </>
        )}

        {state.validLines && state.invalidLines && (
          <>
            <br />

            {`${state.validLines.length} hosts will be mapped`}

            <EuiCodeBlock
              overflowHeight={400}
              lineNumbers
              language="CSV"
              isVirtualized
              css={css`
                border: 1px solid ${euiTheme.colors.success};
              `}
            >
              {validLinesAsText}
            </EuiCodeBlock>

            <br />

            {`${state.invalidLines.length} asset criticality value or hosts is not recognized`}

            {state.invalidLines && (
              <EuiButtonEmpty
                onClick={() => {
                  if (state.invalidLines) {
                    const invalidLines = Papa.unparse(state.invalidLines);
                    downloadBlob(new Blob([invalidLines]), `invalid_asset_criticality.csv`);
                  }
                }}
              >
                {'Download CSV'}
              </EuiButtonEmpty>
            )}

            <EuiCodeBlock
              overflowHeight={400}
              lineNumbers
              language="CSV"
              isVirtualized
              css={css`
                border: 1px solid ${euiTheme.colors.danger};
              `}
            >
              {invalidLinesAsText}
            </EuiCodeBlock>
          </>
        )}
      </div>
    </div>
  );
};

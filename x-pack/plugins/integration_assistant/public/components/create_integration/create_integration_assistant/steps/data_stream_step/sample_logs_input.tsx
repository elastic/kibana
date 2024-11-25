/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiCallOut, EuiFilePicker, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { isPlainObject } from 'lodash/fp';
import type { IntegrationSettings } from '../../types';
import * as i18n from './translations';
import { useActions } from '../../state';
import type { SamplesFormat } from '../../../../../../common';
import { partialShuffleArray } from '../../../../../../common';
import { FRONTEND_SAMPLE_ROWS } from '../../../../../../common/constants';

/**
 * Parse the logs sample file content as newiline-delimited JSON (NDJSON).
 *
 * This supports multiline JSON objects if passed multiline flag.
 * Note that in that case the { character must happen at the beginning of the
 * line if and only if it denotes the start of a new JSON object. Thus some
 * inputs that will be parsed as NDJSON without the multiline flag will _not_ be
 * parsed as NDJSON with the multiline flag.
 */
export const parseNDJSON = (fileContent: string, multiline: boolean = false): unknown[] => {
  const separator = multiline ? /\n(?=\{)/ : '\n';

  return fileContent
    .split(separator) // For multiline, split at newline followed by '{'.
    .filter((entry) => entry.trim() !== '') // Remove empty entries.
    .map((entry) => JSON.parse(entry)); // Parse each entry as JSON.
};

/**
 * Parse the logs sample file content as a JSON, find an array of entries there.
 *
 * If the JSON object can be parsed, but is not an array, we try to find a candidate
 * among the dictionary keys (it must be identifier-like and its value must be an array).
 *
 * @returns Both the parsed entries and the path to the entries in the JSON object in case of
 * success. Otherwise, an errorNoArrayFound if appropriate. If the parsing failed, raises an error.
 */
export const parseJSONArray = (
  fileContent: string
): { entries: unknown[]; pathToEntries: string[]; errorNoArrayFound: boolean } => {
  const jsonContent = JSON.parse(fileContent);
  if (Array.isArray(jsonContent)) {
    return { entries: jsonContent, pathToEntries: [], errorNoArrayFound: false };
  }
  if (typeof jsonContent === 'object' && jsonContent !== null) {
    const arrayKeys = Object.keys(jsonContent).filter((key) => Array.isArray(jsonContent[key]));
    if (arrayKeys.length === 1) {
      const key = arrayKeys[0];
      return {
        entries: jsonContent[key],
        pathToEntries: [key],
        errorNoArrayFound: false,
      };
    }
  }
  return { errorNoArrayFound: true, entries: [], pathToEntries: [] };
};

/**
 * Selects samples from the backend from an array of log samples type T.
 *
 * This is a generic function to apply to arrays of any type.
 *
 * The array is changed in-place so that it will:
 *   - have no more than MaxLogsSampleRows; and
 *   - be shuffled using the reproducible shuffle algorithm;
 *   - however, the first element will be kept in-place.
 *
 * The idea is to perform the same amount of operations on the array
 * regardless of its size and to not use any extra memory.
 *
 * @param array - The array to select from (cannot be empty).
 * @template T - The type of elements in the array.
 * @returns Whether the array was truncated.
 */
function trimShuffleLogsSample<T>(array: T[]): boolean {
  const willTruncate = array.length > FRONTEND_SAMPLE_ROWS;
  const numElements = willTruncate ? FRONTEND_SAMPLE_ROWS : array.length;

  partialShuffleArray(array, 1, numElements);

  if (willTruncate) {
    array.length = numElements;
  }

  return willTruncate;
}

// The error message structure.
interface PrepareLogsErrorResult {
  error: string;
}

// The parsed logs sample structure.
interface PrepareLogsSuccessResult {
  // Format of the samples, if able to be determined.
  samplesFormat?: SamplesFormat;
  // The parsed log samples. If samplesFormat is (ND)JSON, these are JSON strings.
  logSamples: string[];
  // Whether the log samples were truncated.
  isTruncated: boolean;
}

type PrepareLogsResult = PrepareLogsErrorResult | PrepareLogsSuccessResult;

/**
 * Prepares the logs sample to send to the backend from the user-provided file.
 *
 * This function will return an error message if the file content is not valid, that is:
 *  - it is too large to parse (the memory required is 2-3x of the file size); or
 *  - it looks like a JSON format, but there is no array; or
 *  - it looks like (ND)JSON format, but the items are not JSON dictionaries; or
 *  - the list of entries is empty.
 * In other cases it will parse and return the `logSamples` array of strings.
 *
 * Additionally if the format was (ND)JSON:
 *  - the `samplesFormat` field will be filled out with the format description; and
 *  - the samples will be serialized back to JSON strings;
 * otherwise:
 *  - the `samplesFormat` field will be undefined; and
 *  - the samples will be strings with unknown structure.
 *
 * In all cases it will also:
 *  - shuffle the parsed logs sample using the reproducible shuffle algorithm;
 *  - return no more than MaxLogsSampleRows entries.
 *
 * @param fileContent The content of the user-provided logs sample file.
 * @returns The parsed logs sample structure or an error message.
 */
const prepareLogsContent = (fileContent: string): PrepareLogsResult => {
  let parsedJSONContent: unknown[];
  let jsonSamplesFormat: SamplesFormat;

  try {
    parsedJSONContent = parseNDJSON(fileContent);

    // Special case for files that can be parsed as both JSON and NDJSON:
    //   for a one-line array [] -> extract its contents (it's a JSON)
    //   for a one-line object {} -> do nothing (keep as NDJSON)
    if (parsedJSONContent.length === 1 && Array.isArray(parsedJSONContent[0])) {
      parsedJSONContent = parsedJSONContent[0];
      jsonSamplesFormat = { name: 'json', json_path: [] };
    } else {
      jsonSamplesFormat = { name: 'ndjson', multiline: false };
    }
  } catch (parseNDJSONError) {
    if (parseNDJSONError instanceof RangeError) {
      return { error: i18n.LOGS_SAMPLE_ERROR.TOO_LARGE_TO_PARSE };
    }
    try {
      const { entries, pathToEntries, errorNoArrayFound } = parseJSONArray(fileContent);
      if (errorNoArrayFound) {
        return { error: i18n.LOGS_SAMPLE_ERROR.NOT_ARRAY };
      }
      parsedJSONContent = entries;
      jsonSamplesFormat = { name: 'json', json_path: pathToEntries };
    } catch (parseJSONError) {
      if (parseJSONError instanceof RangeError) {
        return { error: i18n.LOGS_SAMPLE_ERROR.TOO_LARGE_TO_PARSE };
      }
      try {
        parsedJSONContent = parseNDJSON(fileContent, true);
        jsonSamplesFormat = { name: 'ndjson', multiline: true };
      } catch (parseMultilineNDJSONError) {
        if (parseMultilineNDJSONError instanceof RangeError) {
          return { error: i18n.LOGS_SAMPLE_ERROR.TOO_LARGE_TO_PARSE };
        }
        // This is an unknown format, so split into lines and return no samplesFormat.
        const fileLines = fileContent.split('\n').filter((line) => line.trim() !== '');
        if (fileLines.length === 0) {
          return { error: i18n.LOGS_SAMPLE_ERROR.EMPTY };
        }

        const isTruncated = trimShuffleLogsSample(fileLines);

        return {
          samplesFormat: undefined,
          logSamples: fileLines,
          isTruncated,
        };
      }
    }
  }

  // This seems to be an ND(JSON), so perform additional checks and return jsonSamplesFormat.

  if (parsedJSONContent.some((log) => !isPlainObject(log))) {
    return { error: i18n.LOGS_SAMPLE_ERROR.NOT_OBJECT };
  }

  if (parsedJSONContent.length === 0) {
    return { error: i18n.LOGS_SAMPLE_ERROR.EMPTY };
  }

  const isTruncated = trimShuffleLogsSample(parsedJSONContent);

  return {
    samplesFormat: jsonSamplesFormat,
    logSamples: parsedJSONContent.map((line) => JSON.stringify(line)),
    isTruncated,
  };
};

interface SampleLogsInputProps {
  integrationSettings: IntegrationSettings | undefined;
}

export const SampleLogsInput = React.memo<SampleLogsInputProps>(({ integrationSettings }) => {
  const { setIntegrationSettings } = useActions();
  const [isParsing, setIsParsing] = useState(false);
  const [sampleFileError, setSampleFileError] = useState<string>();

  const onChangeLogsSample = useCallback(
    (files: FileList | null) => {
      if (!files) {
        return;
      }

      setSampleFileError(undefined);
      setIntegrationSettings({
        ...integrationSettings,
        logSamples: undefined,
        samplesFormat: undefined,
      });

      const logsSampleFile = files[0];
      const reader = new FileReader();

      reader.onloadstart = function () {
        setIsParsing(true);
      };

      reader.onloadend = function () {
        setIsParsing(false);
      };

      reader.onload = function (e) {
        const fileContent = e.target?.result as string | undefined; // We can safely cast to string since we call `readAsText` to load the file.

        if (fileContent == null) {
          setSampleFileError(i18n.LOGS_SAMPLE_ERROR.CAN_NOT_READ);
          return;
        }

        if (fileContent === '' && e.loaded > 100000) {
          // V8-based browsers can't handle large files and return an empty string
          // instead of an error; see https://stackoverflow.com/a/61316641
          setSampleFileError(i18n.LOGS_SAMPLE_ERROR.TOO_LARGE_TO_PARSE);
          return;
        }

        const prepareResult = prepareLogsContent(fileContent);

        if ('error' in prepareResult) {
          setSampleFileError(prepareResult.error);
          return;
        }

        const { samplesFormat, logSamples } = prepareResult;

        setIntegrationSettings({
          ...integrationSettings,
          logSamples,
          samplesFormat,
        });
      };

      const handleReaderError = function () {
        const message = reader.error?.message;
        if (message) {
          setSampleFileError(i18n.LOGS_SAMPLE_ERROR.CAN_NOT_READ_WITH_REASON(message));
        } else {
          setSampleFileError(i18n.LOGS_SAMPLE_ERROR.CAN_NOT_READ);
        }
      };

      reader.onerror = handleReaderError;
      reader.onabort = handleReaderError;

      reader.readAsText(logsSampleFile);
    },
    [integrationSettings, setIntegrationSettings, setIsParsing]
  );
  return (
    <EuiFormRow
      label={i18n.LOGS_SAMPLE_LABEL}
      helpText={
        <EuiText color="danger" size="xs">
          {sampleFileError}
        </EuiText>
      }
      isInvalid={sampleFileError != null}
    >
      <>
        <EuiCallOut iconType="iInCircle" color="warning">
          {i18n.LOGS_SAMPLE_WARNING}
        </EuiCallOut>
        <EuiSpacer size="s" />

        <EuiFilePicker
          id="logsSampleFilePicker"
          initialPromptText={
            <>
              <EuiText size="s" textAlign="center">
                {i18n.LOGS_SAMPLE_DESCRIPTION}
              </EuiText>
            </>
          }
          onChange={onChangeLogsSample}
          display="large"
          aria-label="Upload logs sample file"
          isLoading={isParsing}
          data-test-subj="logsSampleFilePicker"
          data-loading={isParsing}
        />
      </>
    </EuiFormRow>
  );
});
SampleLogsInput.displayName = 'SampleLogsInput';

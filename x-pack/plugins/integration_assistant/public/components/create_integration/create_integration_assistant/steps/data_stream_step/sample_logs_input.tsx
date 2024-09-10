/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiCallOut, EuiFilePicker, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { isPlainObject } from 'lodash/fp';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IntegrationSettings } from '../../types';
import * as i18n from './translations';
import { useActions } from '../../state';
import type { SamplesFormat } from '../../../../../../common';

const MaxLogsSampleRows = 10;

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

interface ParseLogsErrorResult {
  error: string;
}

interface ParseLogsSuccessResult {
  // Format of the samples, if able to be determined.
  samplesFormat?: SamplesFormat;
  // The parsed log samples. If samplesFormat is (ND)JSON, these are JSON strings.
  logSamples: string[];
}

type ParseLogsResult = ParseLogsErrorResult | ParseLogsSuccessResult;

/**
 * Parse the logs sample file content and return the parsed logs sample.
 *
 * This function will return an error message if the file content is not valid, that is:
 *  - it is too large to parse (the memory required is 2-3x of the file size); or
 *  - it looks like a JSON format, but there is no array; or
 *  - it looks like (ND)JSON format, but the items are not JSON dictionaries.
 *
 * Otherwise it is guaranteed to parse and return (possibly empty) `logSamples` array.
 * If the file content is (ND)JSON, it will additionally fill out the `samplesFormat`
 * field with name 'json' or 'ndjson'; otherwise it will be undefined.
 */
const parseLogsContent = (fileContent: string): ParseLogsResult => {
  let parsedContent: unknown[];
  let samplesFormat: SamplesFormat;

  try {
    parsedContent = parseNDJSON(fileContent);

    // Special case for files that can be parsed as both JSON and NDJSON:
    //   for a one-line array [] -> extract its contents (it's a JSON)
    //   for a one-line object {} -> do nothing (keep as NDJSON)
    if (parsedContent.length === 1 && Array.isArray(parsedContent[0])) {
      parsedContent = parsedContent[0];
      samplesFormat = { name: 'json', json_path: [] };
    } else {
      samplesFormat = { name: 'ndjson', multiline: false };
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
      parsedContent = entries;
      samplesFormat = { name: 'json', json_path: pathToEntries };
    } catch (parseJSONError) {
      if (parseJSONError instanceof RangeError) {
        return { error: i18n.LOGS_SAMPLE_ERROR.TOO_LARGE_TO_PARSE };
      }
      try {
        parsedContent = parseNDJSON(fileContent, true);
        samplesFormat = { name: 'ndjson', multiline: true };
      } catch (parseMultilineNDJSONError) {
        if (parseMultilineNDJSONError instanceof RangeError) {
          return { error: i18n.LOGS_SAMPLE_ERROR.TOO_LARGE_TO_PARSE };
        }
        return {
          logSamples: fileContent.split('\n').filter((line) => line.trim() !== ''),
          samplesFormat: undefined, // Signifies that the format is unknown.
        };
      }
    }
  }

  if (parsedContent.some((log) => !isPlainObject(log))) {
    return { error: i18n.LOGS_SAMPLE_ERROR.NOT_OBJECT };
  }

  const logSamples = parsedContent.map((log) => JSON.stringify(log));
  return { logSamples, samplesFormat };
};

interface SampleLogsInputProps {
  integrationSettings: IntegrationSettings | undefined;
}

export const SampleLogsInput = React.memo<SampleLogsInputProps>(({ integrationSettings }) => {
  const { notifications } = useKibana().services;
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

        const result = parseLogsContent(fileContent);

        if ('error' in result) {
          setSampleFileError(result.error);
          return;
        }

        const { logSamples: possiblyLargeLogSamples, samplesFormat } = result;

        if (possiblyLargeLogSamples.length === 0) {
          setSampleFileError(i18n.LOGS_SAMPLE_ERROR.EMPTY);
          return;
        }

        let logSamples;
        if (possiblyLargeLogSamples.length > MaxLogsSampleRows) {
          logSamples = possiblyLargeLogSamples.slice(0, MaxLogsSampleRows);
          notifications?.toasts.addInfo(i18n.LOGS_SAMPLE_TRUNCATED(MaxLogsSampleRows));
        } else {
          logSamples = possiblyLargeLogSamples;
        }

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
    [integrationSettings, setIntegrationSettings, notifications?.toasts, setIsParsing]
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
              <EuiText size="xs" color="subdued" textAlign="center">
                {i18n.LOGS_SAMPLE_DESCRIPTION_2}
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

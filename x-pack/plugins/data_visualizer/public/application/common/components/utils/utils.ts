/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { AnalysisResult, InputOverrides } from '../../../../../../file_upload/common';
import { MB, FILE_FORMATS } from '../../../../../common/constants';

export const DEFAULT_LINES_TO_SAMPLE = 1000;
const UPLOAD_SIZE_MB = 5;

const overrideDefaults = {
  timestampFormat: undefined,
  timestampField: undefined,
  format: undefined,
  delimiter: undefined,
  quote: undefined,
  hasHeaderRow: undefined,
  charset: undefined,
  columnNames: undefined,
  shouldTrimFields: undefined,
  grokPattern: undefined,
  linesToSample: undefined,
};

export function readFile(file: File) {
  return new Promise((resolve, reject) => {
    if (file && file.size) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      reader.onload = (() => {
        return () => {
          const decoder = new TextDecoder();
          const data = reader.result;
          if (data === null || typeof data === 'string') {
            return reject();
          }
          const size = UPLOAD_SIZE_MB * MB;
          const fileContents = decoder.decode(data.slice(0, size));

          if (fileContents === '') {
            reject();
          } else {
            resolve({ fileContents, data });
          }
        };
      })();
    } else {
      reject();
    }
  });
}

export function createUrlOverrides(overrides: InputOverrides, originalSettings: InputOverrides) {
  const formattedOverrides: InputOverrides = {};
  for (const o in overrideDefaults) {
    if (overrideDefaults.hasOwnProperty(o)) {
      let value = overrides[o];
      if (
        (Array.isArray(value) && isEqual(value, originalSettings[o])) ||
        value === undefined ||
        value === originalSettings[o]
      ) {
        value = '';
      }

      const snakeCaseO = o.replace(/([A-Z])/g, ($1) => `_${$1.toLowerCase()}`);
      formattedOverrides[snakeCaseO] = value;
    }
  }

  if (formattedOverrides.format === '' && originalSettings.format === FILE_FORMATS.DELIMITED) {
    if (
      formattedOverrides.should_trim_fields !== '' ||
      formattedOverrides.has_header_row !== '' ||
      formattedOverrides.delimiter !== '' ||
      formattedOverrides.quote !== '' ||
      formattedOverrides.column_names !== ''
    ) {
      formattedOverrides.format = originalSettings.format;
    }

    if (Array.isArray(formattedOverrides.column_names)) {
      formattedOverrides.column_names = formattedOverrides.column_names.join();
    }
  }

  if (
    formattedOverrides.format === '' &&
    originalSettings.format === FILE_FORMATS.SEMI_STRUCTURED_TEXT
  ) {
    if (formattedOverrides.grok_pattern !== '') {
      formattedOverrides.format = originalSettings.format;
    }
  }

  if (
    formattedOverrides.format === FILE_FORMATS.NDJSON ||
    originalSettings.format === FILE_FORMATS.NDJSON
  ) {
    formattedOverrides.should_trim_fields = '';
    formattedOverrides.has_header_row = '';
    formattedOverrides.delimiter = '';
    formattedOverrides.quote = '';
    formattedOverrides.column_names = '';
  }

  if (formattedOverrides.lines_to_sample === '') {
    formattedOverrides.lines_to_sample = overrides.linesToSample;
  }

  return formattedOverrides;
}

export function processResults({ results, overrides }: AnalysisResult) {
  const timestampFormat =
    results.java_timestamp_formats !== undefined && results.java_timestamp_formats.length
      ? results.java_timestamp_formats[0]
      : undefined;

  const linesToSample =
    overrides !== undefined && overrides.lines_to_sample !== undefined
      ? overrides.lines_to_sample
      : DEFAULT_LINES_TO_SAMPLE;

  return {
    format: results.format,
    delimiter: results.delimiter,
    timestampField: results.timestamp_field,
    timestampFormat,
    quote: results.quote,
    hasHeaderRow: results.has_header_row,
    shouldTrimFields: results.should_trim_fields,
    charset: results.charset,
    columnNames: results.column_names,
    grokPattern: results.grok_pattern,
    linesToSample,
  };
}

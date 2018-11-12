/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { overrideDefaults } from './overrides';
import { isEqual } from 'lodash';

export function readFile(file) {
  return new Promise((resolve, reject) => {

    if (file && file.size) {
      const reader = new FileReader();
      reader.readAsText(file);

      reader.onload = (() => {
        return () => {
          const data = reader.result;
          if (data === '') {
            reject();
          } else {
            resolve({ data });
          }
        };
      })(file);
    } else {
      reject();
    }
  });
}

export function reduceData(data, mb) {
  // assuming ascii characters in the file where 1 char is 1 byte
  // TODO -  change this when other non UTF-8 formats are
  // supported for the read data
  const size = mb * Math.pow(2, 20);
  return (data.length >= size) ? data.slice(0, size) : data;
}

export function createUrlOverrides(overrides, originalSettings) {
  const formattedOverrides = {};
  for (const o in overrideDefaults) {
    if (overrideDefaults.hasOwnProperty(o)) {
      let value = overrides[o];
      if (
        (Array.isArray(value) && isEqual(value, originalSettings[o]) ||
        (value === undefined || value === originalSettings[o]))
      ) {
        value = '';
      }

      const snakeCaseO = o.replace(/([A-Z])/g, $1 => `_${$1.toLowerCase()}`);
      formattedOverrides[snakeCaseO] = value;
    }
  }

  if (formattedOverrides.format === '' && originalSettings.format === 'delimited') {
    if (
      formattedOverrides.should_trim_fields !== '' ||
      formattedOverrides.has_header_row !== '' ||
      formattedOverrides.delimiter !== '' ||
      formattedOverrides.quote !== '' ||
      formattedOverrides.column_names !== ''
    ) {
      formattedOverrides.format = originalSettings.format;
    }
  }

  if (formattedOverrides.format === '' && originalSettings.format === 'semi_structured_text') {
    if (formattedOverrides.grok_pattern !== '') {
      formattedOverrides.format = originalSettings.format;
    }
  }

  if (formattedOverrides.format === 'ndjson' || originalSettings.format === 'ndjson') {
    formattedOverrides.should_trim_fields = '';
    formattedOverrides.has_header_row = '';
    formattedOverrides.delimiter = '';
    formattedOverrides.quote = '';
    formattedOverrides.column_names = '';
  }

  // escape grok pattern as it can contain bad characters
  if (formattedOverrides.grok_pattern !== '') {
    formattedOverrides.grok_pattern = encodeURIComponent(formattedOverrides.grok_pattern);
  }
  return formattedOverrides;
}

export function processResults(results) {
  const timestampFormat = (results.joda_timestamp_formats !== undefined && results.joda_timestamp_formats.length) ?
    results.joda_timestamp_formats[0] : undefined;

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
  };
}

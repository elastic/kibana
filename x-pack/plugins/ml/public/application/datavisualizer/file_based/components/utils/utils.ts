/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
// @ts-ignore
import numeral from '@elastic/numeral';
import { ml } from '../../../../services/ml_api_service';
import { AnalysisResult, InputOverrides } from '../../../../../../common/types/file_datavisualizer';
import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_BYTES,
  ABSOLUTE_MAX_FILE_SIZE_BYTES,
  FILE_SIZE_DISPLAY_FORMAT,
} from '../../../../../../common/constants/file_datavisualizer';
import { getUiSettings } from '../../../../util/dependency_cache';
import { FILE_DATA_VISUALIZER_MAX_FILE_SIZE } from '../../../../../../common/constants/settings';

const DEFAULT_LINES_TO_SAMPLE = 1000;
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
          const size = UPLOAD_SIZE_MB * Math.pow(2, 20);
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

export function getMaxBytes() {
  const maxFileSize = getUiSettings().get(FILE_DATA_VISUALIZER_MAX_FILE_SIZE, MAX_FILE_SIZE);
  // @ts-ignore
  const maxBytes = numeral(maxFileSize.toUpperCase()).value();
  if (maxBytes < MAX_FILE_SIZE_BYTES) {
    return MAX_FILE_SIZE_BYTES;
  }
  return maxBytes <= ABSOLUTE_MAX_FILE_SIZE_BYTES ? maxBytes : ABSOLUTE_MAX_FILE_SIZE_BYTES;
}

export function getMaxBytesFormatted() {
  return numeral(getMaxBytes()).format(FILE_SIZE_DISPLAY_FORMAT);
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

    if (Array.isArray(formattedOverrides.column_names)) {
      formattedOverrides.column_names = formattedOverrides.column_names.join();
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

/**
 * A check for the minimum privileges needed to create and ingest data into an index.
 * If called with no indexName, the check will just look for the minimum cluster privileges.
 * @param {string} indexName
 * @returns {Promise<boolean>}
 */
export async function hasImportPermission(indexName: string) {
  const priv: { cluster: string[]; index?: any } = {
    cluster: ['cluster:monitor/nodes/info', 'cluster:admin/ingest/pipeline/put'],
  };

  if (indexName !== undefined) {
    priv.index = [
      {
        names: [indexName],
        privileges: ['indices:data/write/bulk', 'indices:data/write/index', 'indices:admin/create'],
      },
    ];
  }

  const resp = await ml.hasPrivileges(priv);
  return resp.securityDisabled === true || resp.has_all_requested === true;
}

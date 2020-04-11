/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import numeral from '@elastic/numeral';
import { ml } from '../../../../services/ml_api_service';
import { AnalysisResult, InputOverrides } from '../../../../../../common/types/file_datavisualizer';
import {
  ABSOLUTE_MAX_BYTES,
  FILE_SIZE_DISPLAY_FORMAT,
} from '../../../../../../common/constants/file_datavisualizer';
import { getMlConfig } from '../../../../util/dependency_cache';

const DEFAULT_LINES_TO_SAMPLE = 1000;

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
      })();
    } else {
      reject();
    }
  });
}

export function reduceData(data: string, mb: number) {
  // assuming ascii characters in the file where 1 char is 1 byte
  // TODO -  change this when other non UTF-8 formats are
  // supported for the read data
  const size = mb * Math.pow(2, 20);
  return data.length >= size ? data.slice(0, size) : data;
}

export function getMaxBytes() {
  const maxBytes = getMlConfig().file_data_visualizer.max_file_size_bytes;
  return maxBytes < ABSOLUTE_MAX_BYTES ? maxBytes : ABSOLUTE_MAX_BYTES;
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

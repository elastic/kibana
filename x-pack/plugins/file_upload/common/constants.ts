/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const UI_SETTING_MAX_FILE_SIZE = 'fileUpload:maxFileSize';
const MB = Math.pow(2, 20);
const MAX_FILE_SIZE = '100MB';
const MAX_FILE_SIZE_BYTES = 104857600; // 100MB
const ABSOLUTE_MAX_FILE_SIZE_BYTES = 1073741274; // 1GB
const FILE_SIZE_DISPLAY_FORMAT = '0,0.[0] b';

// Value to use in the Elasticsearch index mapping meta data to identify the
// index as having been created by the ML File Data Visualizer.
const INDEX_META_DATA_CREATED_BY = 'file-data-visualizer';

const FILE_FORMATS = {
  DELIMITED: 'delimited',
  NDJSON: 'ndjson',
  SEMI_STRUCTURED_TEXT: 'semi_structured_text',
  // XML: 'xml',
};

export const FILE_UPLOAD = {
  ABSOLUTE_MAX_FILE_SIZE_BYTES,
  FILE_FORMATS,
  FILE_SIZE_DISPLAY_FORMAT,
  INDEX_META_DATA_CREATED_BY,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_BYTES,
  MB,
  UI_SETTING_MAX_FILE_SIZE,
} as const;

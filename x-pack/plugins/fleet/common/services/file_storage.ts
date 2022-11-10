/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_STORAGE_DATA_INDEX_PATTERN, FILE_STORAGE_METADATA_INDEX_PATTERN } from '../constants';

/**
 * Returns the index name for File Metadata storage for a given integration
 * @param integrationName
 */
export const getFileMetadataIndexName = (integrationName: string): string => {
  if (FILE_STORAGE_METADATA_INDEX_PATTERN.indexOf('*') !== -1) {
    return FILE_STORAGE_METADATA_INDEX_PATTERN.replace('*', integrationName);
  }

  throw new Error(
    `Unable to define integration file data index. No '*' in index pattern: ${FILE_STORAGE_METADATA_INDEX_PATTERN}`
  );
};
/**
 * Returns the index name for File data (chunks) storage for a given integration
 * @param integrationName
 */
export const getFileDataIndexName = (integrationName: string): string => {
  if (FILE_STORAGE_DATA_INDEX_PATTERN.indexOf('*') !== -1) {
    return FILE_STORAGE_DATA_INDEX_PATTERN.replace('*', integrationName);
  }

  throw new Error(
    `Unable to define integration file data index. No '*' in index pattern: ${FILE_STORAGE_DATA_INDEX_PATTERN}`
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// File storage indexes supporting endpoint Upload/download
// If needing to get an integration specific index name, use the utility functions
// found in `common/services/file_storage`
export const FILE_STORAGE_METADATA_INDEX_PATTERN = '.fleet-files-*';
export const FILE_STORAGE_DATA_INDEX_PATTERN = '.fleet-file-data-*';

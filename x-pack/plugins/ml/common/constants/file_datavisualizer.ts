/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const MAX_BYTES = 104857600;
export const ABSOLUTE_MAX_BYTES = MAX_BYTES * 5;
export const FILE_SIZE_DISPLAY_FORMAT = '0,0.[0] b';

// Value to use in the Elasticsearch index mapping meta data to identify the
// index as having been created by the ML File Data Visualizer.
export const INDEX_META_DATA_CREATED_BY = 'ml-file-data-visualizer';

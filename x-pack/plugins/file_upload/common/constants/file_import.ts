/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const MAX_BYTES = 31457280;

export const MAX_FILE_SIZE = 52428800;

// Value to use in the Elasticsearch index mapping metadata to identify the
// index as having been created by the File Upload Plugin.
export const INDEX_META_DATA_CREATED_BY = 'file-upload-plugin';

export const ES_GEO_FIELD_TYPE = {
  GEO_POINT: 'geo_point',
  GEO_SHAPE: 'geo_shape',
};

export const DEFAULT_KBN_VERSION = 'kbnVersion';

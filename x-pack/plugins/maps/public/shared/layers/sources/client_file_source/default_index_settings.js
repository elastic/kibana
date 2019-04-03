/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const DEFAULT_INDEX_NAME = 'geojson_upload';

const DEFAULT_SETTINGS = {
  number_of_shards: 1
};

const DEFAULT_MAPPINGS = {
  "name": {
    "type": "keyword"
  },
  "location": {
    "type": "geo_point"
  }
};

const DEFAULT_INGEST_PIPELINE = {};

export const defaultSettings = {
  index: DEFAULT_INDEX_NAME,
  ingestPipeline: DEFAULT_INGEST_PIPELINE,
  mappings: DEFAULT_MAPPINGS,
  settings: DEFAULT_SETTINGS
};

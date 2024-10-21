/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_VERSION } from '../../../../common/constants';

export const logsAllDefaultPipeline = {
  id: 'logs-all@default-pipeline',
  processors: [
    {
      set: {
        description: "If '@timestamp' is missing, set it with the ingest timestamp",
        field: '@timestamp',
        override: false,
        copy_from: '_ingest.timestamp',
      },
    },
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
    {
      append: {
        field: 'labels.elastic.stream_entities',
        value: ['logs-all'],
      },
    },
    {
      pipeline: {
        name: 'logs-all@reroutes',
        ignore_missing_pipeline: true,
      },
    },
  ],
  _meta: {
    description: 'Default pipeline for the logs-all StreamEntity',
    managed: true,
  },
  version: ASSET_VERSION,
};

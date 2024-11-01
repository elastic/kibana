/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_VERSION } from '../../../../common/constants';

export const logsDefaultPipeline = {
  id: 'logs@stream.default-pipeline',
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
      pipeline: {
        name: 'logs@stream.json-pipeline',
        ignore_missing_pipeline: true,
      },
    },
    {
      pipeline: {
        name: 'logs@stream.reroutes',
        ignore_missing_pipeline: true,
      },
    },
  ],
  _meta: {
    description: 'Default pipeline for the logs stream',
    managed: true,
  },
  version: ASSET_VERSION,
};

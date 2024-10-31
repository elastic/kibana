/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_VERSION } from '../../../../common/constants';

export function generateIngestPipeline(id: string) {
  return {
    id: `${id}@default-pipeline`,
    processors: [
      {
        append: {
          field: 'labels.elastic.stream_entities',
          value: [id],
        },
      },
      {
        pipeline: {
          name: `${id}@reroutes`,
          ignore_missing_pipeline: true,
        },
      },
    ],
    _meta: {
      description: `Default pipeline for the ${id} StreamEntity`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}

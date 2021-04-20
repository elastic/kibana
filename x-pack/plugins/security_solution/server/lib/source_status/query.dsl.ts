/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SERVICE_NAME = 'service.name';

export const buildQuery = ({ defaultIndex }: { defaultIndex: string[] }) => {
  return {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    terminate_after: 1,
    body: {
      size: 0,
      aggs: {
        total_service_names: {
          cardinality: {
            field: SERVICE_NAME,
          },
        },
      },
    },
    track_total_hits: false,
  };
};

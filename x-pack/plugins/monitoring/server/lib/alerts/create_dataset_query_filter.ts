/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * metricset and dataset should match but there are currently exceptions which could just be bugs
 * @param  {string} type matches legacy data
 * @param  {string} metricset matches standalone beats
 * @param  {string} dataset matches agent integration data streams
 */
export const createDatasetFilter = (type: string, metricset: string, dataset: string) => ({
  bool: {
    should: [
      {
        term: {
          type,
        },
      },
      {
        term: {
          'metricset.name': metricset,
        },
      },
      {
        term: {
          'data_stream.dataset': dataset,
        },
      },
    ],
    minimum_should_match: 1,
  },
});

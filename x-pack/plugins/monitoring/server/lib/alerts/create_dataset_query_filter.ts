/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We expected metricset and dataset to match but it appears to be the case that
 * dataset is the full {product}.{metricset}, whereas metricset doesn't include
 * the product, e.g. dataset is elasticsearch.cluster_stats and metricset is
 * just cluster_stats.
 *
 * TODO: Consider having this function accept "product" and "metricset", and
 * concatenate them together to form the dataset, to avoid repetition, or
 * provide types to narrow the valid values for dataset and metricset.
 *
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';

export const isCounterTimeSeriesMetricField = (field: DataViewField) =>
  field.timeSeriesMetric === 'counter';

const SUPPORTED_AGGS = {
  COUNTER: new Set(['count', 'min', 'max']),
  AGGREGATABLE: new Set(['count', 'cardinality', 'percentiles', 'stats', 'terms']),
  DEFAULT: new Set<string>(),
};

/**
 * Temporarily add list of supported ES aggs until the PR below is merged
 * https://github.com/elastic/elasticsearch/pull/93884
 */
export const getSupportedAggs = (field: DataViewField) => {
  if (isCounterTimeSeriesMetricField(field)) {
    return SUPPORTED_AGGS.COUNTER;
  }
  if (field.aggregatable) {
    return SUPPORTED_AGGS.AGGREGATABLE;
  }
  return SUPPORTED_AGGS.DEFAULT;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel, TSVBSeries, InventoryMetric } from './types';

export const createTSVBModel = (
  id: InventoryMetric,
  requires: string[],
  series: TSVBSeries[],
  interval = '>=300s',
  dropLastBucket = true
): TSVBMetricModelCreator => (timeField, indexPattern): TSVBMetricModel => ({
  id,
  requires,
  drop_last_bucket: dropLastBucket,
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series,
});

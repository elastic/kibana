/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildAnomaliesHistogramQuery } from './query.anomalies_histogram.dsl';

export const anomaliesMatrixHistogramConfig = {
  buildDsl: buildAnomaliesHistogramQuery,
  aggName: 'aggregations.anomalyActionGroup.buckets',
  parseKey: 'anomalies.buckets',
};

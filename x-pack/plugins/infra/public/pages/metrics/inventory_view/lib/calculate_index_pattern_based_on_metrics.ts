/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceQuery } from '../../../../graphql/types';
import { METRICS_INDEX_PATTERN, LOGS_INDEX_PATTERN } from '../../../../../common/constants';
import { SnapshotMetricType } from '../../../../../common/inventory_models/types';

export const calculateIndexPatterBasedOnMetrics = (
  metrics: Array<{ type: SnapshotMetricType }>,
  source?: SourceQuery.Source
) => {
  const metricAlias = source?.configuration.metricAlias || METRICS_INDEX_PATTERN;
  const logAlias = source?.configuration.logAlias || LOGS_INDEX_PATTERN;
  if (metrics.every((m) => m.type === 'logRate')) {
    return logAlias;
  }
  if (metrics.some((m) => m.type === 'logRate')) {
    return `${logAlias},${metricAlias}`;
  }
  return metricAlias;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotRequest } from '../../../../common/http_api';
import { InfraSource } from '../../../lib/sources';

export const calculateIndexPatterBasedOnMetrics = (
  options: SnapshotRequest,
  source: InfraSource
) => {
  const { metrics } = options;
  if (metrics.every((m) => m.type === 'logRate')) {
    return source.configuration.logAlias;
  }
  if (metrics.some((m) => m.type === 'logRate')) {
    return `${source.configuration.logAlias},${source.configuration.metricAlias}`;
  }
  return source.configuration.metricAlias;
};

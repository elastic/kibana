/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ErrorWithStatusCode } from '../../error_with_status_code';
import { MetricsSummaryClient } from '../../services/metrics_summary_client';
import type { MetricsSummaryRequestHandlerContext } from '../../types';

export const getMetricsSummaryClient = (
  context: MetricsSummaryRequestHandlerContext
): MetricsSummaryClient => {
  const metricsSummary = context.metricsSummary?.getMetricsSummaryClient();
  if (metricsSummary == null) {
    throw new ErrorWithStatusCode('Metrics Summary is not found as a plugin', 404);
  } else {
    return metricsSummary;
  }
};

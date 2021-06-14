/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorWithStatusCode } from '../../error_with_status_code';
import { MetricsEntitiesClient } from '../../services/metrics_entities_client';
import type { MetricsEntitiesRequestHandlerContext } from '../../types';

export const getMetricsEntitiesClient = (
  context: MetricsEntitiesRequestHandlerContext
): MetricsEntitiesClient => {
  const metricsEntities = context.metricsEntities?.getMetricsEntitiesClient();
  if (metricsEntities == null) {
    throw new ErrorWithStatusCode('Metrics Entities is not found as a plugin', 404);
  } else {
    return metricsEntities;
  }
};

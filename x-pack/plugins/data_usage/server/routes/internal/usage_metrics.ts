/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DataUsageContext,
  DataUsageRouter,
  UsageMetricsRequestSchema,
  UsageMetricsResponseSchema,
} from '../../types';

import { getUsageMetricsHandler } from './usage_metrics_handler';

export const registerUsageMetricsRoute = (
  router: DataUsageRouter,
  dataUsageContext: DataUsageContext
) => {
  if (dataUsageContext.serverConfig.enabled) {
    router.versioned
      .get({
        access: 'internal',
        path: '/internal/api/data_usage/metrics',
      })
      .addVersion(
        {
          version: '1',
          validate: {
            request: UsageMetricsRequestSchema,
            response: {
              200: UsageMetricsResponseSchema,
            },
          },
        },
        getUsageMetricsHandler(dataUsageContext)
      );
  }
};

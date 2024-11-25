/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageMetricsRequestSchema, UsageMetricsResponseSchema } from '../../../common/rest_types';
import { DATA_USAGE_METRICS_API_ROUTE } from '../../../common';
import { DataUsageContext, DataUsageRouter } from '../../types';

import { getUsageMetricsHandler } from './usage_metrics_handler';

export const registerUsageMetricsRoute = (
  router: DataUsageRouter,
  dataUsageContext: DataUsageContext
) => {
  router.versioned
    .post({
      access: 'internal',
      path: DATA_USAGE_METRICS_API_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: UsageMetricsRequestSchema,
          },
          response: {
            200: UsageMetricsResponseSchema,
          },
        },
      },
      getUsageMetricsHandler(dataUsageContext)
    );
};

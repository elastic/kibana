/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { MetricResult } from '../plugin';

export function registerMetricsRoute({
  router,
  getMetrics,
}: {
  router: IRouter;
  getMetrics: () => Promise<Record<string, MetricResult[]>>;
}) {
  router.get(
    {
      path: '/api/metrics',
      options: {
        // authRequired: !config.allowAnonymous,
        tags: ['api'], // ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page
      },
      validate: false,
    },
    async (context, req, res) => {
      const metrics = await getMetrics();
      return res.ok({
        body: metrics,
      });
    }
  );
}

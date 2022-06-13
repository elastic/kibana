/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { PROMETHEUS_ROUTE } from '../constants';
import { PrometheusExporter } from '../lib/prometheus_exporter';

export function registerV1PrometheusRoute({
  router,
  prometheusExporter,
}: {
  router: IRouter;
  prometheusExporter: PrometheusExporter;
}) {
  router.get(
    {
      path: PROMETHEUS_ROUTE,
      options: {
        authRequired: true,
        tags: ['api'], // ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page
      },
      validate: {},
    },
    async (context, req, res) => {
      return prometheusExporter.exportMetrics(res);
    }
  );
}

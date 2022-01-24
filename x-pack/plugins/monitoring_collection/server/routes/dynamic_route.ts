/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import { schema } from '@kbn/config-schema';
import { IRouter, ServiceStatus } from '../../../../../src/core/server';
import { getESClusterUuid, getKibanaStats } from '../lib';
import { MetricResult } from '../plugin';

export function registerDynamicRoute({
  router,
  config,
  overallStatus$,
  getMetrics,
}: {
  router: IRouter;
  config: {
    allowAnonymous: boolean;
    kibanaIndex: string;
    kibanaVersion: string;
    uuid: string;
    server: {
      name: string;
      hostname: string;
      port: number;
    };
  };
  overallStatus$: Observable<ServiceStatus>;
  getMetrics: (type: string) => Promise<MetricResult[] | MetricResult | undefined>;
}) {
  router.get(
    {
      path: `/api/monitoring_collection/{type}`,
      options: {
        // authRequired: !config.allowAnonymous,
        tags: ['api'], // ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page
      },
      validate: {
        params: schema.object({
          type: schema.string(),
        }),
      },
    },
    async (context, req, res) => {
      const type = req.params.type;
      const [data, clusterUuid, kibana] = await Promise.all([
        getMetrics(type),
        getESClusterUuid(context.core.elasticsearch.client),
        getKibanaStats({ config, overallStatus$ }),
      ]);

      return res.ok({
        body: {
          [type]: data,
          cluster_uuid: clusterUuid,
          kibana,
        },
      });
    }
  );
}

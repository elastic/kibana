/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonObject } from '@kbn/utility-types';
import { schema } from '@kbn/config-schema';
import { IRouter, ServiceStatus } from '../../../../../src/core/server';
import { getESClusterUuid, getKibanaStats } from '../lib';
import { MetricResult } from '../plugin';

export function registerDynamicRoute({
  router,
  config,
  getStatus,
  getMetric,
}: {
  router: IRouter;
  config: {
    kibanaIndex: string;
    kibanaVersion: string;
    uuid: string;
    server: {
      name: string;
      hostname: string;
      port: number;
    };
  };
  getStatus: () => ServiceStatus<unknown>;
  getMetric: (
    type: string
  ) => Promise<Array<MetricResult<JsonObject>> | MetricResult<JsonObject> | undefined>;
}) {
  router.get(
    {
      path: `/api/monitoring_collection/{type}`,
      options: {
        authRequired: true,
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
        getMetric(type),
        getESClusterUuid(context.core.elasticsearch.client),
        getKibanaStats({ config, getStatus }),
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

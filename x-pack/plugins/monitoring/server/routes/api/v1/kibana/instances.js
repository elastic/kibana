/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getKibanaClusterStatus } from './_get_kibana_cluster_status';
import { getKibanas } from '../../../../lib/kibana/get_kibanas';
import { handleError } from '../../../../lib/errors';

export function kibanaInstancesRoute(server) {
  /**
   * Kibana listing (instances)
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana/instances',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req) {
      const clusterUuid = req.params.clusterUuid;

      try {
        const [clusterStatus, kibanas] = await Promise.all([
          getKibanaClusterStatus(req, { clusterUuid }),
          getKibanas(req, { clusterUuid }),
        ]);

        return {
          clusterStatus,
          kibanas,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { getClustersFromRequest } from '../../../../lib/cluster/get_clusters_from_request';
import { handleError } from '../../../../lib/errors';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';
import { verifyCcsAvailability } from '../../../../lib/elasticsearch/verify_ccs_availability';

export function clusterRoute(server) {
  /*
   * Cluster Overview
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}',
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
          codePaths: schema.arrayOf(schema.string()),
        }),
      },
    },
    handler: async (req) => {
      const config = server.config();
      await verifyCcsAvailability(req);

      const indexPatterns = getIndexPatterns(server, {
        filebeatIndexPattern: config.get('monitoring.ui.logs.index'),
      });
      const options = {
        clusterUuid: req.params.clusterUuid,
        start: req.payload.timeRange.min,
        end: req.payload.timeRange.max,
        codePaths: req.payload.codePaths,
      };

      let clusters = [];
      try {
        clusters = await getClustersFromRequest(req, indexPatterns, options);
      } catch (err) {
        throw handleError(err, req);
      }
      return clusters;
    },
  });
}

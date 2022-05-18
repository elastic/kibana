/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getClustersFromRequest } from '../../../../lib/cluster/get_clusters_from_request';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';
import { handleError } from '../../../../lib/errors';
import { LegacyRequest, MonitoringCore } from '../../../../types';

export function clusterRoute(server: MonitoringCore) {
  /*
   * Cluster Overview
   */
  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}',
    validate: {
      params: schema.object({
        clusterUuid: schema.string(),
      }),
      body: schema.object({
        ccs: schema.maybe(schema.string()),
        timeRange: schema.object({
          min: schema.string(),
          max: schema.string(),
        }),
        codePaths: schema.arrayOf(schema.string()),
      }),
    },
    handler: async (req: LegacyRequest) => {
      const config = server.config;

      const indexPatterns = getIndexPatterns(config, {
        filebeatIndexPattern: config.ui.logs.index,
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

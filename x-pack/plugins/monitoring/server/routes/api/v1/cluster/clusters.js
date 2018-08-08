/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClustersFromRequest } from '../../../../lib/cluster/get_clusters_from_request';
import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { handleError } from '../../../../lib/errors';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';

export function clustersRoute(server) {
  /*
   * Monitoring Home
   * Route Init (for checking license and compatibility for multi-cluster monitoring
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters',
    config: {
      validate: {
        payload: Joi.object({
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required()
        })
      }
    },
    handler: async (req, reply) => {
      let clusters = [];

      // NOTE using try/catch because checkMonitoringAuth is expected to throw
      // an error when current logged-in user doesn't have permission to read
      // the monitoring data. `try/catch` makes it a little more explicit.
      try {
        await verifyMonitoringAuth(req);

        // wildcard means to search _all_ clusters
        const ccs = '*';
        const config = server.config();
        const esIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.elasticsearch.index_pattern', ccs);
        const kbnIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.kibana.index_pattern', ccs);
        const lsIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.logstash.index_pattern', ccs);
        const beatsIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.beats.index_pattern', ccs);
        const alertsIndex = prefixIndexPattern(config, 'xpack.monitoring.cluster_alerts.index', ccs);
        const indexPatterns = { esIndexPattern, kbnIndexPattern, lsIndexPattern, beatsIndexPattern, alertsIndex };

        clusters = await getClustersFromRequest(req, indexPatterns);
      } catch (err) {
        return reply(handleError(err, req));
      }

      return reply(clusters);
    }
  });
}

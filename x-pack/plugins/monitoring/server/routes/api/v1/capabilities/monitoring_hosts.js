/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { handleError } from '../../../../lib/errors';

export function monitoringHostsRoute(server) {
  /*
   * Monitoring Home
   * Route Init (for checking license and compatibility for multi-cluster monitoring
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/capabilities/monitoring_hosts',
    handler: async (req) => {
      const config = server.config();
      // NOTE using try/catch because checkMonitoringAuth is expected to throw
      // an error when current logged-in user doesn't have permission to read
      // the monitoring data. `try/catch` makes it a little more explicit.
      try {
        await verifyMonitoringAuth(req);

        const monitoringHosts = config.get('xpack.monitoring.elasticsearch.hosts');
        if (monitoringHosts) {
          return monitoringHosts;
        }

        return [];

        // const legacyEsConfig = await server.core.elasticsearch.legacy.config$.pipe(first()).toPromise();
        // return legacyEsConfig.hosts;
      } catch (err) {
        throw handleError(err, req);
      }
    }
  });
}

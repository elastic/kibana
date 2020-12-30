/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { handleError } from '../../../../lib/errors';

/*
 * API for checking read privilege on Monitoring Data
 * Used for the "Access Denied" page as something to auto-retry with.
 */
export function checkAccessRoute(server) {
  server.route({
    method: 'GET',
    path: '/api/monitoring/v1/check_access',
    handler: async (req) => {
      const response = {};
      try {
        await verifyMonitoringAuth(req);
        response.has_access = true; // response data is ignored
      } catch (err) {
        throw handleError(err, req);
      }
      return response;
    },
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { handleError } from '../../../../lib/errors';
import { getCollectionStatus } from '../../../../lib/setup/collection';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';

export function nodeSetupStatusRoute(server) {
  /*
   * Monitoring Home
   * Route Init (for checking license and compatibility for multi-cluster monitoring
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/setup/collection/node/{nodeUuid}',
    config: {
      validate: {
        params: schema.object({
          nodeUuid: schema.string(),
        }),
        query: schema.object({
          // This flag is not intended to be used in production. It was introduced
          // as a way to ensure consistent API testing - the typical data source
          // for API tests are archived data, where the cluster configuration and data
          // are consistent from environment to environment. However, this endpoint
          // also attempts to retrieve data from the running stack products (ES and Kibana)
          // which will vary from environment to environment making it difficult
          // to write tests against. Therefore, this flag exists and should only be used
          // in our testing environment.
          skipLiveData: schema.boolean({ defaultValue: false }),
        }),
        payload: schema.nullable(
          schema.object({
            ccs: schema.maybe(schema.string()),
            timeRange: schema.maybe(
              schema.object({
                min: schema.string(),
                max: schema.string(),
              })
            ),
          })
        ),
      },
    },
    handler: async (req) => {
      let status = null;

      // NOTE using try/catch because checkMonitoringAuth is expected to throw
      // an error when current logged-in user doesn't have permission to read
      // the monitoring data. `try/catch` makes it a little more explicit.
      try {
        await verifyMonitoringAuth(req);
        const indexPatterns = getIndexPatterns(server, {}, req.payload.ccs);
        status = await getCollectionStatus(
          req,
          indexPatterns,
          null,
          req.params.nodeUuid,
          req.query.skipLiveData
        );
      } catch (err) {
        throw handleError(err, req);
      }

      return status;
    },
  });
}

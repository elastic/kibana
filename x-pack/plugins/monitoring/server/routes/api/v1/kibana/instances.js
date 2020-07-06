/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getKibanaClusterStatus } from './_get_kibana_cluster_status';
import { getKibanas } from '../../../../lib/kibana/get_kibanas';
import { handleError } from '../../../../lib/errors';
import { INDEX_PATTERN_KIBANA } from '../../../../../common/constants';

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
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);

      try {
        const [clusterStatus, kibanas] = await Promise.all([
          getKibanaClusterStatus(req, kbnIndexPattern, { clusterUuid }),
          getKibanas(req, kbnIndexPattern, { clusterUuid }),
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

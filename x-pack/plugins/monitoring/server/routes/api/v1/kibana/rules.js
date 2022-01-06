/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { prefixIndexPattern } from '../../../../../common/ccs_utils';
import { getKibanaClusterStatus } from './_get_kibana_cluster_status';
import { handleError } from '../../../../lib/errors';
import { INDEX_PATTERN_KIBANA } from '../../../../../common/constants';
import { getRules } from '../../../../lib/kibana/kibana_rules/get_rules';

export function kibanaRulesRoute(server) {
  /**
   * Kibana listing (rules)
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana/rules',
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
        const [clusterStatus, rules] = await Promise.all([
          getKibanaClusterStatus(req, kbnIndexPattern, { clusterUuid }),
          getRules(req, kbnIndexPattern, { clusterUuid }),
        ]);

        return {
          clusterStatus,
          rules,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}

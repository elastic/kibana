/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { alertsClusterSearch } from '../../../../cluster_alerts/alerts_cluster_search';
import { checkLicense } from '../../../../cluster_alerts/check_license';
import { getClusterLicense } from '../../../../lib/cluster/get_cluster_license';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { INDEX_PATTERN_ELASTICSEARCH, INDEX_ALERTS } from '../../../../../common/constants';

/*
 * Cluster Alerts route.
 */
export function legacyClusterAlertsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/legacy_alerts',
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
    handler(req) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
      const alertsIndex = prefixIndexPattern(config, INDEX_ALERTS, ccs);
      const options = {
        start: req.payload.timeRange.min,
        end: req.payload.timeRange.max,
      };

      return getClusterLicense(req, esIndexPattern, clusterUuid).then((license) =>
        alertsClusterSearch(
          req,
          alertsIndex,
          { cluster_uuid: clusterUuid, license },
          checkLicense,
          options
        )
      );
    },
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getKibanaClusterStatus } from './_get_kibana_cluster_status';
import { getKibanas } from '../../../../lib/kibana/get_kibanas';
import { handleError } from '../../../../lib/errors';
import {
  ALERT_KIBANA_VERSION_MISMATCH,
  ALERT_MISSING_MONITORING_DATA,
  INDEX_PATTERN_KIBANA,
  KIBANA_SYSTEM_ID,
} from '../../../../../common/constants';
import { fetchStatus } from '../../../../lib/alerts/fetch_status';

export function kibanaInstancesRoute(server, npRoute) {
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
      const min = moment.utc(req.payload.timeRange.min).valueOf();
      const max = moment.utc(req.payload.timeRange.max).valueOf();
      const clusterUuid = req.params.clusterUuid;
      const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);

      try {
        const alertsClient = req.getAlertsClient();
        const status = alertsClient
          ? await fetchStatus(
              alertsClient,
              npRoute.licenseService,
              [ALERT_KIBANA_VERSION_MISMATCH, ALERT_MISSING_MONITORING_DATA],
              clusterUuid,
              min,
              max,
              [
                {
                  stackProduct: KIBANA_SYSTEM_ID,
                },
              ]
            )
          : {};

        const [clusterStatus, kibanas] = await Promise.all([
          getKibanaClusterStatus(req, kbnIndexPattern, { clusterUuid }),
          getKibanas(req, kbnIndexPattern, { clusterUuid }, status),
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

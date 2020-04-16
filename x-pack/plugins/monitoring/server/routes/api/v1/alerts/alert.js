/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { fetchAlert } from '../../../../lib/alerts/fetch_alert';

/*
 * Cluster Alerts route.
 */
export function alertRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/alert/{alertId}',
    config: {
      validate: {
        params: schema.object({
          alertId: schema.string(),
        }),
        payload: schema.object({
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req) {
      const config = server.config();
      const start = moment(req.payload.timeRange.min).valueOf();
      const end = moment(req.payload.timeRange.max).valueOf();

      const alert = await fetchAlert(
        req.getAlertsClient(),
        req.getUiSettingsService(),
        req.params.alertId,
        req.logger,
        config,
        req,
        start,
        end
      );
      return { alert };
    },
  });
}

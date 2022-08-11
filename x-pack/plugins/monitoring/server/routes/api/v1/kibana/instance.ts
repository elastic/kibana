/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKibanaInfo } from '../../../../lib/kibana/get_kibana_info';
import { handleError } from '../../../../lib/errors';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_instance';
import { LegacyRequest } from '../../../../types';
import { MonitoringCore } from '../../../../types';
import {
  postKibanaInstanceRequestParamsRT,
  postKibanaInstanceRequestPayloadRT,
  postKibanaInstanceResponsePayloadRT,
} from '../../../../../common/http_api/kibana';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';

export function kibanaInstanceRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postKibanaInstanceRequestParamsRT);
  const validateBody = createValidationFunction(postKibanaInstanceRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana/{kibanaUuid}',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req: LegacyRequest) {
      const clusterUuid = req.params.clusterUuid;
      const kibanaUuid = req.params.kibanaUuid;

      try {
        const [metrics, kibanaSummary] = await Promise.all([
          getMetrics(req, 'kibana', metricSet),
          getKibanaInfo(req, { clusterUuid, kibanaUuid }),
        ]);

        return postKibanaInstanceResponsePayloadRT.encode({
          metrics,
          kibanaSummary,
        });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}

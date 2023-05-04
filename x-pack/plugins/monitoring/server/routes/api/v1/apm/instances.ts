/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postApmInstancesRequestParamsRT,
  postApmInstancesRequestPayloadRT,
  postApmInstancesResponsePayloadRT,
} from '../../../../../common/http_api/apm';
import { getApms, getStats } from '../../../../lib/apm';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { handleError } from '../../../../lib/errors';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';
import { MonitoringCore } from '../../../../types';

export function apmInstancesRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postApmInstancesRequestParamsRT);
  const validateBody = createValidationFunction(postApmInstancesRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm/instances',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const config = server.config;
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const apmIndexPattern = getIndexPatterns({
        ccs,
        config,
        moduleType: 'beats',
        dataset: 'stats',
      });

      try {
        const [stats, apms] = await Promise.all([
          getStats(req, apmIndexPattern, clusterUuid),
          getApms(req, apmIndexPattern, clusterUuid),
        ]);

        return postApmInstancesResponsePayloadRT.encode({
          stats,
          apms,
          cgroup: config.ui.container.apm.enabled,
        });
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}

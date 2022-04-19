/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prefixIndexPatternWithCcs } from '../../../../../common/ccs_utils';
import { INDEX_PATTERN_BEATS } from '../../../../../common/constants';
import {
  postApmInstancesRequestParamsRT,
  postApmInstancesRequestPayloadRT,
} from '../../../../../common/http_api/apm';
import { createValidationFunction } from '../../../../../common/runtime_types';
import { getApms, getStats } from '../../../../lib/apm';
import { handleError } from '../../../../lib/errors';
import { MonitoringCore } from '../../../../types';

export function apmInstancesRoute(server: MonitoringCore) {
  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm/instances',
    validate: {
      params: createValidationFunction(postApmInstancesRequestParamsRT),
      body: createValidationFunction(postApmInstancesRequestPayloadRT),
    },
    async handler(req) {
      const config = server.config;
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const apmIndexPattern = prefixIndexPatternWithCcs(config, INDEX_PATTERN_BEATS, ccs);

      try {
        const [stats, apms] = await Promise.all([
          getStats(req, apmIndexPattern, clusterUuid),
          getApms(req, apmIndexPattern, clusterUuid),
        ]);

        return {
          stats,
          apms,
          cgroup: config.ui.container.apm.enabled,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}

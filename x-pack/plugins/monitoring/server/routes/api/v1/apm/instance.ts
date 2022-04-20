/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prefixIndexPatternWithCcs } from '../../../../../common/ccs_utils';
import { INDEX_PATTERN_BEATS } from '../../../../../common/constants';
import {
  postApmInstanceRequestParamsRT,
  postApmInstanceRequestPayloadRT,
} from '../../../../../common/http_api/apm';
import { getApmInfo } from '../../../../lib/apm';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors';
import { MonitoringCore } from '../../../../types';
import { metricSet } from './metric_set_instance';

export function apmInstanceRoute(server: MonitoringCore) {
  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm/{apmUuid}',
    validate: {
      params: createValidationFunction(postApmInstanceRequestParamsRT),
      body: createValidationFunction(postApmInstanceRequestPayloadRT),
    },
    async handler(req) {
      const apmUuid = req.params.apmUuid;
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;
      const ccs = req.payload.ccs;
      const apmIndexPattern = prefixIndexPatternWithCcs(config, INDEX_PATTERN_BEATS, ccs);

      const showCgroupMetrics = config.ui.container.apm.enabled;
      if (showCgroupMetrics) {
        const metricCpu = metricSet.find((m) => m.name === 'apm_cpu');
        if (metricCpu) {
          metricCpu.keys = ['apm_cgroup_cpu'];
        }
      }

      try {
        const [metrics, apmSummary] = await Promise.all([
          getMetrics(req, 'beats', metricSet, [{ term: { 'beats_stats.beat.uuid': apmUuid } }]),
          getApmInfo(req, apmIndexPattern, { clusterUuid, apmUuid }),
        ]);

        return {
          metrics,
          apmSummary,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}

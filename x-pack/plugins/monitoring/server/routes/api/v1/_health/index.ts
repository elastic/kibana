/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyRequest, MonitoringCore } from '../../../../types';
import { MonitoringConfig } from '../../../../config';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getHealthRequestQueryRT } from '../../../../../common/http_api/_health';
import { TimeRange } from '../../../../../common/http_api/shared';
import { INDEX_PATTERN } from '../../../../../common/constants';

import { fetchMonitoredClusters } from './monitored_clusters';

const extractSettings = (config: MonitoringConfig) => {
  return {
    ccs: config.ui.ccs.enabled,
    logsIndex: config.ui.logs.index,
    metricbeatIndex: config.ui.metricbeat.index,
    hasRemoteClusterConfigured: (config.ui.elasticsearch.hosts || []).some(Boolean),
  };
};

export function health(server: MonitoringCore) {
  const validateQuery = createValidationFunction(getHealthRequestQueryRT);
  const settings = extractSettings(server.config);
  const index = (() => {
    let pattern = INDEX_PATTERN;
    if (server.config.ui.ccs.enabled) {
      pattern += `,*:${INDEX_PATTERN}`;
    }
    return pattern;
  })();

  server.route({
    method: 'get',
    path: '/api/monitoring/v1/_health',
    validate: {
      query: validateQuery,
    },
    async handler(req: LegacyRequest) {
      const logger = req.getLogger();
      const timeRange = {
        min: req.query.min || 'now-30m',
        max: req.query.max || 'now',
      } as TimeRange;
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

      const monitoredClusters = await fetchMonitoredClusters({
        index,
        timeRange,
        search: (params: any) => callWithRequest(req, 'search', params),
      }).catch((err: Error) => {
        logger.error(`_health: failed to retrieve monitored clusters: ${err}`);
        return { error: err.message };
      });

      return { monitoredClusters, settings };
    },
  });
}

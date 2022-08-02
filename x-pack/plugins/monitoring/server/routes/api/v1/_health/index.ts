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
import { INDEX_PATTERN, INDEX_PATTERN_ENTERPRISE_SEARCH } from '../../../../../common/constants';

import { fetchMonitoredClusters } from './monitored_clusters';

const DEFAULT_QUERY_TIMERANGE = { min: 'now-15m', max: 'now' };
const DEFAULT_QUERY_TIMEOUT_SECONDS = 15;

export function registerV1HealthRoute(server: MonitoringCore) {
  const validateQuery = createValidationFunction(getHealthRequestQueryRT);

  const withCCS = (indexPattern: string) => {
    if (server.config.ui.ccs.enabled) {
      return `${indexPattern},*:${indexPattern}`;
    }
    return indexPattern;
  };

  server.route({
    method: 'get',
    path: '/api/monitoring/v1/_health',
    validate: {
      query: validateQuery,
    },
    async handler(req: LegacyRequest) {
      const logger = req.getLogger();
      const timeRange = {
        min: req.query.min || DEFAULT_QUERY_TIMERANGE.min,
        max: req.query.max || DEFAULT_QUERY_TIMERANGE.max,
      } as TimeRange;
      const timeout = req.query.timeout || DEFAULT_QUERY_TIMEOUT_SECONDS;
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

      const settings = extractSettings(server.config);

      const monitoredClusters = await fetchMonitoredClusters({
        timeout,
        timeRange,
        monitoringIndex: withCCS(INDEX_PATTERN),
        entSearchIndex: withCCS(INDEX_PATTERN_ENTERPRISE_SEARCH),
        search: (params: any) => callWithRequest(req, 'search', params),
        logger,
      }).catch((err: Error) => {
        logger.error(`_health: failed to retrieve monitored clusters:\n${err.stack}`);
        return { error: err.message };
      });

      return { monitoredClusters, settings };
    },
  });
}

function extractSettings(config: MonitoringConfig) {
  return {
    ccs: config.ui.ccs.enabled,
    logsIndex: config.ui.logs.index,
    metricbeatIndex: config.ui.metricbeat.index,
    hasRemoteClusterConfigured: (config.ui.elasticsearch.hosts || []).some(Boolean),
  };
}

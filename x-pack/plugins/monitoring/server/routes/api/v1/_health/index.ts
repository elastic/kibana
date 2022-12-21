/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacyRequest, MonitoringCore } from '../../../../types';
import type { MonitoringConfig } from '../../../../config';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';
import { getHealthRequestQueryRT } from '../../../../../common/http_api/_health';
import type { TimeRange } from '../../../../../common/http_api/shared';

import { fetchMonitoredClusters } from './monitored_clusters';
import { fetchMetricbeatErrors } from './metricbeat';
import type { FetchParameters } from './types';

const DEFAULT_QUERY_TIMERANGE = { min: 'now-15m', max: 'now' };
const DEFAULT_QUERY_TIMEOUT_SECONDS = 15;

export function registerV1HealthRoute(server: MonitoringCore) {
  const validateQuery = createValidationFunction(getHealthRequestQueryRT);
  const { config } = server;

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

      const settings = extractSettings(config);

      const fetchArgs: FetchParameters = {
        timeout,
        timeRange,
        search: (params: any) => callWithRequest(req, 'search', params),
        logger,
      };

      const monitoringIndex = [
        getIndexPatterns({ config, moduleType: 'elasticsearch' }),
        getIndexPatterns({ config, moduleType: 'kibana' }),
        getIndexPatterns({ config, moduleType: 'logstash' }),
        getIndexPatterns({ config, moduleType: 'beats' }),
      ].join(',');
      const entSearchIndex = getIndexPatterns({ config, moduleType: 'enterprise_search' });

      const monitoredClustersFn = () =>
        fetchMonitoredClusters({
          ...fetchArgs,
          monitoringIndex,
          entSearchIndex,
        }).catch((err: Error) => {
          logger.error(`_health: failed to retrieve monitored clusters:\n${err.stack}`);
          return { error: err.message };
        });

      const metricbeatErrorsFn = () =>
        fetchMetricbeatErrors({
          ...fetchArgs,
          metricbeatIndex: config.ui.metricbeat.index,
        }).catch((err: Error) => {
          logger.error(`_health: failed to retrieve metricbeat data:\n${err.stack}`);
          return { error: err.message };
        });

      const [monitoredClusters, metricbeatErrors] = await Promise.all([
        monitoredClustersFn(),
        metricbeatErrorsFn(),
      ]);

      return { monitoredClusters, metricbeatErrors, settings };
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

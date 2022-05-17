/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleError } from '../../../../lib/errors';
import { LegacyRequest, LegacyServer, MonitoringCore } from '../../../../types';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';
import { fetchMonitoredClusters } from './monitored_clusters';

export function health(server: MonitoringCore) {
  server.route({
    method: 'get',
    path: '/api/monitoring/v1/_health',
    validate: false,
    async handler(req: LegacyRequest) {
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

      const monitoredClusters = await fetchMonitoredClusters((params) =>
        callWithRequest(req, 'search', params)
      );

      return { monitoredClusters };
    },
  });
}

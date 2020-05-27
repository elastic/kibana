/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ROUTES, MONITORING } from '../../../common/constants';
import { PipelineListItem } from '../../models/pipeline_list_item';

export class MonitoringService {
  constructor(http, isMonitoringEnabled, clusterService) {
    this.http = http;
    this._isMonitoringEnabled = isMonitoringEnabled;
    this.clusterService = clusterService;
  }

  isMonitoringEnabled() {
    return this._isMonitoringEnabled;
  }

  getPipelineList() {
    if (!this.isMonitoringEnabled()) {
      return Promise.resolve([]);
    }

    return this.clusterService
      .loadCluster()
      .then((cluster) => {
        // This API call should live within the Monitoring plugin
        // https://github.com/elastic/kibana/issues/63931
        const url = `${ROUTES.MONITORING_API_ROOT}/v1/clusters/${cluster.uuid}/logstash/pipeline_ids`;
        const now = moment.utc();
        const body = JSON.stringify({
          timeRange: {
            max: now.toISOString(),
            min: now.subtract(MONITORING.ACTIVE_PIPELINE_RANGE_S, 'seconds').toISOString(),
          },
        });
        return this.http.post(url, { body });
      })
      .then((response) =>
        response.map((pipeline) => PipelineListItem.fromUpstreamMonitoringJSON(pipeline))
      )
      .catch(() => []);
  }
}

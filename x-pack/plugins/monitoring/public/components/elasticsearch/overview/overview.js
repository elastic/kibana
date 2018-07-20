/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ClusterStatus } from '../cluster_status';
import { ShardActivity } from '../shard_activity';
import { MonitoringTimeseriesContainer } from 'plugins/monitoring/components';

export function ElasticsearchOverview({
  clusterStatus,
  metrics,
  shardActivity,
  ...props
}) {
  return (
    <Fragment>
      <ClusterStatus stats={clusterStatus} />

      <div className="page-row">
        <div className="row">
          <div className="col-md-6">
            <MonitoringTimeseriesContainer
              series={metrics.cluster_search_request_rate}
              {...props}
            />
          </div>
          <div className="col-md-6">
            <MonitoringTimeseriesContainer
              series={metrics.cluster_query_latency}
              {...props}
            />
          </div>
          <div className="col-md-6">
            <MonitoringTimeseriesContainer
              series={metrics.cluster_index_request_rate}
              {...props}
            />
          </div>
          <div className="col-md-6">
            <MonitoringTimeseriesContainer
              series={metrics.cluster_index_latency}
              {...props}
            />
          </div>
        </div>
      </div>

      <div className="page-row">
        <ShardActivity data={shardActivity} {...props} />
      </div>
    </Fragment>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ClusterStatus } from '../cluster_status';
import { ShardActivity } from '../shard_activity';
import { MonitoringTimeseriesContainer } from '../../chart';
import { EuiPage, EuiFlexGrid, EuiFlexItem, EuiSpacer, EuiPageBody } from '@elastic/eui';

export function ElasticsearchOverview({
  clusterStatus,
  metrics,
  shardActivity,
  ...props
}) {
  const metricsToShow = [
    metrics.cluster_search_request_rate,
    metrics.cluster_query_latency,
    metrics.cluster_index_request_rate,
    metrics.cluster_index_latency,
  ];

  return (
    <Fragment>
      <ClusterStatus stats={clusterStatus} />
      <EuiPage style={{ backgroundColor: 'white' }}>
        <EuiPageBody>
          <EuiFlexGrid columns={2} gutterSize="none">
            {metricsToShow.map((metric, index) => (
              <EuiFlexItem key={index} style={{ width: '50%' }}>
                <MonitoringTimeseriesContainer
                  series={metric}
                  {...props}
                />
                <EuiSpacer size="m"/>
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
          <ShardActivity data={shardActivity} {...props} />
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
}

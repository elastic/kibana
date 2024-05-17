/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPage, EuiPageBody, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { MonitoringTimeseriesContainer } from '../../chart';
import { Logs } from '../../logs/logs';
import { ClusterStatus } from '../cluster_status';
import { ShardActivity } from '../shard_activity';

export function ElasticsearchOverview({
  clusterStatus,
  metrics,
  logs,
  cluster,
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
    <EuiPage>
      <EuiPageBody>
        <EuiPanel>
          <ClusterStatus stats={clusterStatus} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>
          <EuiFlexGrid columns={2} gutterSize="s">
            {metricsToShow.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer series={metric} {...props} />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>
          <Logs logs={logs} clusterUuid={cluster.cluster_uuid} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>
          <ShardActivity data={shardActivity} {...props} />
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageContent,
  EuiPageBody,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
} from '@elastic/eui';
import { NodeDetailStatus } from '../node_detail_status';
import { MonitoringTimeseriesContainer } from '../../chart';
import { ShardAllocation } from '../shard_allocation/shard_allocation';

export const Node = ({
  nodeSummary,
  metrics,
  scope,
  kbnUrl,
  ...props
}) => {
  const metricsToShow = [
    metrics.node_jvm_mem,
    metrics.node_mem,
    metrics.node_cpu_metric,
    metrics.node_load_average,
    metrics.node_latency,
    metrics.node_segment_count,
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <NodeDetailStatus stats={nodeSummary} />
          <EuiSpacer size="m"/>
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
          <EuiSpacer size="m"/>
          <ShardAllocation scope={scope} kbnUrl={kbnUrl}/>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

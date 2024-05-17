/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { AlertsCallout } from '../../../alerts/callout';
import { MonitoringTimeseriesContainer } from '../../chart';
import { NodeDetailStatus } from '../node_detail_status';

export const AdvancedNode = ({ nodeSummary, metrics, alerts, ...props }) => {
  const metricsToShow = [
    metrics.node_gc,
    metrics.node_gc_time,
    metrics.node_jvm_mem,
    metrics.node_cpu_utilization,
    metrics.node_index_3,
    metrics.node_index_4,
    metrics.node_index_time,
    metrics.node_request_total,
    metrics.node_index_threads,
    metrics.node_read_threads,
    metrics.node_cgroup_cpu,
    metrics.node_cgroup_stats,
    metrics.node_latency,
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.elasticsearch.nodes.advanced.heading"
              defaultMessage="Elasticsearch node advanced"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPanel>
          <NodeDetailStatus stats={nodeSummary} alerts={alerts} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <AlertsCallout alerts={alerts} />
        <EuiPageSection>
          <EuiFlexGrid columns={2} gutterSize="s">
            {metricsToShow.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer series={metric} {...props} />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};

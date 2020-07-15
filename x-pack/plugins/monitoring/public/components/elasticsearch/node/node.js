/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import {
  EuiPage,
  EuiPageContent,
  EuiPageBody,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { NodeDetailStatus } from '../node_detail_status';
import { Logs } from '../../logs/';
import { MonitoringTimeseriesContainer } from '../../chart';
import { ShardAllocation } from '../shard_allocation/shard_allocation';
import { FormattedMessage } from '@kbn/i18n/react';
import { AlertsCallout } from '../../../alerts/callout';

export const Node = ({
  nodeSummary,
  metrics,
  logs,
  alerts,
  nodeId,
  clusterUuid,
  scope,
  ...props
}) => {
  if (alerts) {
    for (const alertTypeId of Object.keys(alerts)) {
      const alertInstance = alerts[alertTypeId];
      for (const { meta } of alertInstance.states) {
        const metricList = get(meta, 'metrics', []);
        for (const metric of metricList) {
          if (metrics[metric]) {
            metrics[metric].alerts = metrics[metric].alerts || {};
            metrics[metric].alerts[alertTypeId] = alertInstance;
          }
        }
      }
    }
  }

  const metricsToShow = [
    metrics.node_jvm_mem,
    metrics.node_mem,
    metrics.node_total_io,
    metrics.node_cpu_metric,
    metrics.node_load_average,
    metrics.node_latency,
    metrics.node_segment_count,
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.elasticsearch.node.heading"
              defaultMessage="Elasticsearch node"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPanel>
          <NodeDetailStatus stats={nodeSummary} alerts={alerts} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <AlertsCallout alerts={alerts} />
        <EuiPageContent>
          <EuiFlexGrid columns={2} gutterSize="s">
            {metricsToShow.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer series={metric} {...props} />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageContent>
        <EuiSpacer size="m" />
        <EuiPanel>
          <Logs logs={logs} nodeId={nodeId} clusterUuid={clusterUuid} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>
          <ShardAllocation scope={scope} />
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
};

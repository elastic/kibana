/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
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
  EuiCallOut,
} from '@elastic/eui';
import { NodeDetailStatus } from '../node_detail_status';
import { Logs } from '../../logs/';
import { MonitoringTimeseriesContainer } from '../../chart';
import { ShardAllocation } from '../shard_allocation/shard_allocation';
import { FormattedMessage } from '@kbn/i18n/react';
import { AlertSeverity } from '../../../../common/enums';
import { replaceTokens } from '../../alert/lib';

export const Node = ({
  nodeSummary,
  metrics,
  logs,
  alerts,
  nodeId,
  clusterUuid,
  scope,
  kbnUrl,
  ...props
}) => {
  let warningCallout = null;
  let dangerCallout = null;
  if (alerts) {
    const warnings = [];
    const dangers = [];
    for (const alertTypeId of Object.keys(alerts)) {
      const alertInstance = alerts[alertTypeId];
      for (const { meta, state } of alertInstance.states) {
        const metricList = get(meta, 'metrics', []);
        for (const metric of metricList) {
          if (metrics[metric]) {
            metrics[metric].alerts = metrics[metric].alerts || {};
            metrics[metric].alerts[alertTypeId] = alertInstance;
          }
        }
        if (state.ui.severity === AlertSeverity.Warning) {
          warnings.push(state);
        } else if (state.ui.severity === AlertSeverity.Danger) {
          dangers.push(state);
        }
      }
    }

    if (warnings.length) {
      warningCallout = (
        <Fragment>
          <EuiCallOut title="Warnings" color="warning" iconType="alert">
            <ul>
              {warnings.map((state, index) => {
                return <li key={index}>{replaceTokens(state.ui.message)}</li>;
              })}
            </ul>
          </EuiCallOut>
          <EuiSpacer />
        </Fragment>
      );
    }

    if (dangers.length) {
      dangerCallout = (
        <Fragment>
          <EuiCallOut title="Dangers" color="danger" iconType="alert">
            <ul>
              {dangers.map((state, index) => {
                return <li key={index}>{replaceTokens(state.ui.message)}</li>;
              })}
            </ul>
          </EuiCallOut>
          <EuiSpacer />
        </Fragment>
      );
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
        {dangerCallout}
        {warningCallout}
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
          <ShardAllocation scope={scope} kbnUrl={kbnUrl} />
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
};

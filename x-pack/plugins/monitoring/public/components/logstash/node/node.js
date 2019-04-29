/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiPanel, EuiSpacer, EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { DetailStatus } from '../detail_status';
import { MonitoringTimeseriesContainer } from '../../chart';

export class Node extends PureComponent {
  render() {
    const { stats, metrics, ...rest } = this.props;

    const metricsToShow = [
      metrics.logstash_events_input_rate,
      metrics.logstash_jvm_usage,
      metrics.logstash_events_output_rate,
      metrics.logstash_node_cpu_metric,
      metrics.logstash_events_latency,
      metrics.logstash_os_load,
    ];

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPanel>
            <DetailStatus stats={stats}/>
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiPageContent>
            <EuiFlexGrid columns={2} gutterSize="s">
              {metricsToShow.map((metric, index) => (
                <EuiFlexItem key={index}>
                  <MonitoringTimeseriesContainer
                    series={metric}
                    {...rest}
                  />
                  <EuiSpacer />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
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
          <EuiPageContent>
            <DetailStatus stats={stats}/>
            <EuiSpacer size="m"/>
            <EuiFlexGrid columns={2} gutterSize="none">
              {metricsToShow.map((metric, index) => (
                <EuiFlexItem key={index} style={{ width: '50%' }}>
                  <MonitoringTimeseriesContainer
                    series={metric}
                    {...rest}
                  />
                  <EuiSpacer size="m"/>
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

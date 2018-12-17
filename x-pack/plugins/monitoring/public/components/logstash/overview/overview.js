/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { ClusterStatus } from '../cluster_status';
import { MonitoringTimeseriesContainer } from '../../chart';

export class Overview extends PureComponent {
  render() {
    const { stats, metrics } = this.props;
    const metricsToShow = [
      metrics.logstash_cluster_events_input_rate,
      metrics.logstash_cluster_events_output_rate,
      metrics.logstash_cluster_events_latency
    ];

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <ClusterStatus stats={stats} />
            <EuiSpacer size="m"/>
            <EuiFlexGrid columns={2} gutterSize="none">
              {metricsToShow.map((metric, index) => (
                <EuiFlexItem key={index} style={{ width: '50%' }}>
                  <MonitoringTimeseriesContainer
                    series={metric}
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

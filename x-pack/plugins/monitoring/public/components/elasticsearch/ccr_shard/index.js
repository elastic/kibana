/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { MonitoringTimeseriesContainer } from '../../chart';
import { Status } from './status';

export class CcrShard extends PureComponent {
  renderCharts() {
    const { metrics } = this.props;
    const seriesToShow = [
      metrics.ccr_sync_lag_time,
      metrics.ccr_sync_lag_ops
    ];

    const charts = seriesToShow.map((data, index) => (
      <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
        <EuiPanel>
          <MonitoringTimeseriesContainer
            series={data}
          />
        </EuiPanel>
      </EuiFlexItem>
    ));

    return (
      <Fragment>
        {charts}
      </Fragment>
    );
  }

  render() {
    const { stat } = this.props;

    return (
      <EuiPage style={{ backgroundColor: 'white' }}>
        <EuiPageBody>
          <Status stats={stat}/>
          <EuiSpacer size="s"/>
          <EuiFlexGroup wrap>
            {this.renderCharts()}
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

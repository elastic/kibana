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
  EuiTitle,
  EuiBasicTable,
  EuiCodeBlock,
  EuiTextColor,
  EuiHorizontalRule,
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

  renderExceptions() {
    const { stat } = this.props;
    if (stat.fetch_exceptions && stat.fetch_exceptions.length > 0) {
      return (
        <Fragment>
          <EuiPanel>
            <EuiTitle size="s" color="danger">
              <h3>
                <EuiTextColor color="danger">Exceptions</EuiTextColor>
              </h3>
            </EuiTitle>
            <EuiSpacer size="s"/>
            <EuiBasicTable
              items={stat.fetch_exceptions}
              columns={[
                {
                  name: 'Type',
                  field: 'exception.type'
                },
                {
                  name: 'Reason',
                  field: 'exception.reason',
                  width: '75%'
                }
              ]}
            />
          </EuiPanel>
          <EuiHorizontalRule/>
        </Fragment>
      );
    }
    return null;
  }

  renderLatestStat() {
    const { stat } = this.props;

    return (
      <Fragment>
        <EuiTitle>
          <h2>Advanced</h2>
        </EuiTitle>
        <EuiSpacer size="s"/>
        <EuiCodeBlock language="json">
          {JSON.stringify(stat, null, 2)}
        </EuiCodeBlock>
      </Fragment>
    );
  }

  render() {
    const { stat, oldestStat } = this.props;

    return (
      <EuiPage style={{ backgroundColor: 'white' }}>
        <EuiPageBody>
          <Status stat={stat} oldestStat={oldestStat}/>
          <EuiSpacer size="s"/>
          {this.renderExceptions()}
          <EuiFlexGroup wrap>
            {this.renderCharts()}
          </EuiFlexGroup>
          <EuiHorizontalRule/>
          {this.renderLatestStat()}
        </EuiPageBody>
      </EuiPage>
    );
  }
}

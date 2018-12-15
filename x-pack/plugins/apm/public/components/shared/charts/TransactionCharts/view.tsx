/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import React, { Component } from 'react';
import styled from 'styled-components';
import { getMLJob } from 'x-pack/plugins/apm/public/services/rest/ml';
import { ITransactionChartData } from 'x-pack/plugins/apm/public/store/selectors/chartSelectors';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ViewMLJob } from 'x-pack/plugins/apm/public/utils/url';
import { Coordinate } from 'x-pack/plugins/apm/typings/timeseries';
import { asInteger, asMillis, tpmUnit } from '../../../../utils/formatters';
// @ts-ignore
import CustomPlot from '../CustomPlot';
import { SyncChartGroup } from '../SyncChartGroup';

interface TransactionChartProps {
  charts: ITransactionChartData;
  ChartHeaderContent?: React.ReactNode;
  location: any;
  urlParams: IUrlParams;
  mlAvailable: boolean;
}

interface TransactionChartState {
  hasMLJob: boolean;
}

// const MLTipContainer = styled.div`
// display: flex;
// align-items: center;
// font-size: ${ fontSizes.small };
// `;

// const MLText = styled.div`
// margin - left: ${ px(units.half) };
// `;
//
// const ChartHeaderContent =
//   hasDynamicBaseline && get(license.data, 'features.ml.isAvailable') ? (
//     <MLTipContainer>
//       <EuiIconTip content="The stream around the average duration shows the expected bounds. An annotation is shown for anomaly scores &gt;= 75." />
//       <MLText>
//         Machine Learning:{' '}
//         <ViewMLJob
//           serviceName={serviceName}
//           transactionType={transactionType}
//           location={this.props.location}
//         >
//           View job
//             </ViewMLJob>
//       </MLText>
//     </MLTipContainer>
//   ) : null;

const ShiftedIconWrapper = styled.span`
  padding-right: 5px;
  position: relative;
  top: -1px;
  display: inline-block;
`;

export class TransactionChartsView extends Component<
  TransactionChartProps,
  TransactionChartState
> {
  public state = {
    hasMLJob: false
  };

  public componentDidMount() {
    this.checkForMLJob();
  }

  public componentDidUpdate({
    urlParams: prevUrlParams
  }: TransactionChartProps) {
    const { urlParams } = this.props;
    if (
      prevUrlParams.serviceName !== urlParams.serviceName ||
      prevUrlParams.transactionType !== urlParams.transactionType
    ) {
      this.checkForMLJob();
    }
  }

  public async checkForMLJob() {
    const { serviceName, transactionType } = this.props.urlParams;
    if (!serviceName) {
      return;
    }
    const { count } = await getMLJob({
      serviceName,
      transactionType
    });
    this.setState({ hasMLJob: count > 0 });
  }

  public getResponseTimeTickFormatter = (t: number) => {
    return this.props.charts.noHits ? '- ms' : asMillis(t);
  };

  public getResponseTimeTooltipFormatter = (p: Coordinate) => {
    return this.props.charts.noHits || !p ? '- ms' : asMillis(p.y);
  };

  public getTPMFormatter = (t: number | null) => {
    const { urlParams, charts } = this.props;
    const unit = tpmUnit(urlParams.transactionType);
    return charts.noHits || t === null
      ? `- ${unit}`
      : `${asInteger(t)} ${unit}`;
  };

  public getTPMTooltipFormatter = (p: Coordinate) => {
    return this.getTPMFormatter(p.y);
  };

  public renderMLHeader() {
    if (!this.props.mlAvailable || !this.state.hasMLJob) {
      return null;
    }

    const { serviceName, transactionType } = this.props.urlParams;

    if (!serviceName) {
      return null;
    }

    return (
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <ShiftedIconWrapper>
            <EuiIconTip content="The stream around the average duration shows the expected bounds. An annotation is shown for anomaly scores &gt;= 75." />
          </ShiftedIconWrapper>
          <span>Machine learning: </span>
          <ViewMLJob
            serviceName={serviceName}
            transactionType={transactionType}
            location={this.props.location}
          />
        </EuiText>
      </EuiFlexItem>
    );
  }

  public render() {
    const { charts, urlParams } = this.props;
    const { noHits, responseTimeSeries, tpmSeries } = charts;
    const { transactionType } = urlParams;

    return (
      <SyncChartGroup
        render={chartGroupProps => (
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <EuiPanel>
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem>
                    <EuiTitle size="s">
                      <span>{responseTimeLabel(transactionType)}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                  {this.renderMLHeader()}
                </EuiFlexGroup>
                <CustomPlot
                  noHits={noHits}
                  series={responseTimeSeries}
                  {...chartGroupProps}
                  tickFormatY={this.getResponseTimeTickFormatter}
                  formatTooltipValue={this.getResponseTimeTooltipFormatter}
                />
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem style={{ flexShrink: 1 }}>
              <EuiPanel>
                <EuiTitle size="s">
                  <span>{tpmLabel(transactionType)}</span>
                </EuiTitle>
                <CustomPlot
                  noHits={noHits}
                  series={tpmSeries}
                  {...chartGroupProps}
                  tickFormatY={this.getTPMFormatter}
                  formatTooltipValue={this.getTPMTooltipFormatter}
                  truncateLegends
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGrid>
        )}
      />
    );
  }
}

function tpmLabel(type?: string) {
  return type === 'request' ? 'Requests per minute' : 'Transactions per minute';
}

function responseTimeLabel(type?: string) {
  switch (type) {
    case 'page-load':
      return 'Page load times';
    case 'route-change':
      return 'Route change times';
    default:
      return 'Transactions duration';
  }
}

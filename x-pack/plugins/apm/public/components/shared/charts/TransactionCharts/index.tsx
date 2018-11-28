/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import React, { Component } from 'react';
import styled from 'styled-components';
import { ITransactionChartData } from 'x-pack/plugins/apm/public/store/selectors/chartSelectors';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { Coordinate } from 'x-pack/plugins/apm/typings/timeseries';
import { px, units } from '../../../../style/variables';
import { asInteger, asMillis, tpmUnit } from '../../../../utils/formatters';
// @ts-ignore
import CustomPlot from '../CustomPlot';
import { SyncChartGroup } from '../SyncChartGroup';

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${px(units.half)};
`;

interface TransactionChartProps {
  charts: ITransactionChartData;
  ChartHeaderContent?: React.ReactNode;
  location: any;
  urlParams: IUrlParams;
}

export class TransactionCharts extends Component<TransactionChartProps> {
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

  public render() {
    const { charts, urlParams, ChartHeaderContent = null } = this.props;
    const { noHits, responseTimeSeries, tpmSeries } = charts;
    const { transactionType } = urlParams;

    return (
      <SyncChartGroup
        render={chartGroupProps => (
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <EuiPanel>
                <ChartHeader>
                  <EuiTitle size="s">
                    <span>{responseTimeLabel(transactionType)}</span>
                  </EuiTitle>
                  {ChartHeaderContent}
                </ChartHeader>
                <CustomPlot
                  noHits={noHits}
                  series={responseTimeSeries}
                  {...chartGroupProps}
                  tickFormatY={this.getResponseTimeTickFormatter}
                  formatTooltipValue={this.getResponseTimeTooltipFormatter}
                />
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiPanel>
                <ChartHeader>
                  <EuiTitle size="s">
                    <h6>{tpmLabel(transactionType)}</h6>
                  </EuiTitle>
                </ChartHeader>
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

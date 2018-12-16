/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiTitle } from '@elastic/eui';
import PropTypes from 'prop-types';
import CustomPlot from '../CustomPlot';
import { asMillis, tpmUnit, asInteger } from '../../../../utils/formatters';
import styled from 'styled-components';
import { units, unit, px } from '../../../../style/variables';
import { timefilter } from 'ui/timefilter';
import moment from 'moment';

const ChartsWrapper = styled.div`
  display: flex;
  flex-flow: wrap;
  justify-content: space-between;
  user-select: none;
`;

const Chart = styled.div`
  flex: 0 0 100%;

  @media (min-width: ${px(unit * 60)}) {
    flex: 1 1 0%;

    &:first-child {
      margin-right: ${px(units.half)};
    }
    &:last-child {
      margin-left: ${px(units.half)};
    }
  }
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${px(units.half)};
`;

export class Charts extends Component {
  state = {
    hoverX: null
  };

  onHover = hoverX => this.setState({ hoverX });
  onMouseLeave = () => this.setState({ hoverX: null });
  onSelectionEnd = selection => {
    this.setState({ hoverX: null });
    timefilter.setTime({
      from: moment(selection.start).toISOString(),
      to: moment(selection.end).toISOString(),
      mode: 'absolute'
    });
  };

  getResponseTimeTickFormatter = t => {
    return this.props.charts.noHits ? '- ms' : asMillis(t);
  };

  getResponseTimeTooltipFormatter = (p = {}) => {
    return this.props.charts.noHits ? '- ms' : asMillis(p.y);
  };

  getTPMFormatter = t => {
    const { urlParams, charts } = this.props;
    const unit = tpmUnit(urlParams.transactionType);
    return charts.noHits ? `- ${unit}` : `${asInteger(t)} ${unit}`;
  };

  getTPMTooltipFormatter = (p = {}) => {
    return this.getTPMFormatter(p.y);
  };

  render() {
    const { noHits, responseTimeSeries, tpmSeries } = this.props.charts;
    const { transactionType } = this.props.urlParams;

    return (
      <ChartsWrapper>
        <Chart>
          <ChartHeader>
            <EuiTitle size="s">
              <h5>{responseTimeLabel(transactionType)}</h5>
            </EuiTitle>
            {this.props.ChartHeaderContent}
          </ChartHeader>
          <CustomPlot
            noHits={noHits}
            series={responseTimeSeries}
            onHover={this.onHover}
            onMouseLeave={this.onMouseLeave}
            onSelectionEnd={this.onSelectionEnd}
            hoverX={this.state.hoverX}
            tickFormatY={this.getResponseTimeTickFormatter}
            formatTooltipValue={this.getResponseTimeTooltipFormatter}
          />
        </Chart>

        <Chart>
          <ChartHeader>
            <EuiTitle size="s">
              <h5>{tpmLabel(transactionType)}</h5>
            </EuiTitle>
          </ChartHeader>
          <CustomPlot
            noHits={noHits}
            series={tpmSeries}
            onHover={this.onHover}
            onMouseLeave={this.onMouseLeave}
            onSelectionEnd={this.onSelectionEnd}
            hoverX={this.state.hoverX}
            tickFormatY={this.getTPMFormatter}
            formatTooltipValue={this.getTPMTooltipFormatter}
            truncateLegends
          />
        </Chart>
      </ChartsWrapper>
    );
  }
}

function tpmLabel(type) {
  return type === 'request' ? 'Requests per minute' : 'Transactions per minute';
}

function responseTimeLabel(type) {
  switch (type) {
    case 'page-load':
      return 'Page load times';
    case 'route-change':
      return 'Route change times';
    default:
      return 'Transactions duration';
  }
}

Charts.propTypes = {
  charts: PropTypes.object.isRequired,
  ChartHeaderContent: PropTypes.object,
  location: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};

Charts.defaultProps = {
  ChartHeaderContent: null
};

export default Charts;

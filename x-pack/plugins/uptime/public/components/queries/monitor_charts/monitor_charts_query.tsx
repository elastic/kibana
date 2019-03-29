/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { MonitorChart } from '../../../../common/graphql/types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../../lib/helper';
import { UptimeCommonProps } from '../../../uptime_app';
import { MonitorCharts } from '../../functional';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getMonitorChartsQuery } from './get_monitor_charts';

interface MonitorChartsQueryResult {
  monitorChartsData?: MonitorChart;
}

interface MonitorChartsProps {
  monitorId: string;
}

interface MonitorChartsState {
  crosshairLocation: number;
}

type Props = MonitorChartsProps &
  UptimeCommonProps &
  UptimeGraphQLQueryProps<MonitorChartsQueryResult>;

export class Query extends React.Component<Props, MonitorChartsState> {
  constructor(props: Props) {
    super(props);
    this.state = { crosshairLocation: 0 };
  }

  public render() {
    const {
      colors: { range, mean, danger, success },
      data,
    } = this.props;
    if (data && data.monitorChartsData) {
      const {
        monitorChartsData,
        monitorChartsData: { durationMaxValue, statusMaxCount },
      } = data;

      const durationMax = microsToMillis(durationMaxValue);
      // These limits provide domain sizes for the charts
      const checkDomainLimits = [0, statusMaxCount];
      const durationDomainLimits = [0, durationMax ? durationMax : 0];

      return (
        <MonitorCharts
          checkDomainLimits={checkDomainLimits}
          crosshairLocation={this.state.crosshairLocation}
          danger={danger}
          durationDomainLimits={durationDomainLimits}
          mean={mean}
          monitorChartsData={monitorChartsData}
          range={range}
          success={success}
          updateCrosshairLocation={this.updateCrosshairLocation}
        />
      );
    }
    return i18n.translate('xpack.uptime.monitorCharts.loadingMessage', {
      defaultMessage: 'Loading…',
    });
  }
  private updateCrosshairLocation = (crosshairLocation: number) =>
    this.setState({ crosshairLocation });
}

export const MonitorChartsQuery = withUptimeGraphQL<MonitorChartsQueryResult, MonitorChartsProps>(
  Query,
  getMonitorChartsQuery
);

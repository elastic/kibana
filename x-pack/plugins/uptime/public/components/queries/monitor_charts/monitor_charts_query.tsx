/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'react-apollo';
import { MonitorChart } from '../../../../common/graphql/types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../../lib/helper';
import { UptimeCommonProps } from '../../../uptime_app';
import { MonitorCharts } from '../../functional';
import { createGetMonitorChartsQuery } from './get_monitor_charts';

interface MonitorChartsProps {
  monitorId: string;
}

type Props = MonitorChartsProps & UptimeCommonProps;

export const MonitorChartsQuery = ({
  colors: { primary, secondary, danger },
  dateRangeStart,
  dateRangeEnd,
  monitorId,
  autorefreshIsPaused,
  autorefreshInterval,
}: Props) => {
  return (
    <Query
      pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
      query={createGetMonitorChartsQuery}
      variables={{ dateRangeStart, dateRangeEnd, monitorId }}
    >
      {({ loading, error, data }) => {
        if (loading) {
          return i18n.translate('xpack.uptime.monitorCharts.loadingMessage', {
            defaultMessage: 'Loading…',
          });
        }
        if (error) {
          return i18n.translate('xpack.uptime.monitorCharts.errorMessage', {
            values: { message: error.message },
            defaultMessage: 'Error {message}',
          });
        }

        const {
          monitorChartsData,
          monitorChartsData: { durationMaxValue, statusMaxCount },
        }: { monitorChartsData: MonitorChart } = data;

        const durationMax = microsToMillis(durationMaxValue);
        // These limits provide domain sizes for the charts
        const checkDomainLimits = [0, statusMaxCount];
        const durationDomainLimits = [0, durationMax ? durationMax : 0];

        return (
          <MonitorCharts
            checkDomainLimits={checkDomainLimits}
            danger={danger}
            durationDomainLimits={durationDomainLimits}
            monitorChartData={monitorChartsData}
            primary={primary}
            secondary={secondary}
          />
        );
      }}
    </Query>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore No typing for EuiSuperSelect
import { EuiHealth, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { Monitor } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { getLatestMonitorsQuery } from './get_latest_monitors';

interface MonitorSelectProps {
  valueOfSelectedMonitor?: string;
  onChange: (path: string, state: object) => void;
}

type Props = MonitorSelectProps & UptimeCommonProps;

export const MonitorSelectQuery = ({
  dateRangeStart,
  dateRangeEnd,
  valueOfSelectedMonitor,
  autorefreshInterval,
  autorefreshIsPaused,
  onChange,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
    query={getLatestMonitorsQuery}
    variables={{ dateRangeStart, dateRangeEnd }}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return i18n.translate('xpack.uptime.monitorSelect.loadingMessage', {
          defaultMessage: 'Loading…',
        });
      }
      if (error) {
        return i18n.translate('xpack.uptime.monitorSelect.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const { latestMonitors } = data;
      const options = latestMonitors.map(({ monitor }: { monitor: Monitor }) => ({
        value: monitor.id,
        inputDisplay: (
          <EuiHealth
            color={monitor.status === 'up' ? 'success' : 'danger'}
            style={{ lineHeight: 'inherit' }}
          >
            {monitor.id}
          </EuiHealth>
        ),
      }));
      return (
        <Fragment>
          {options.length > 0 && (
            <EuiSuperSelect
              options={options}
              valueOfSelected={valueOfSelectedMonitor}
              onChange={(e: string) => onChange(`/monitor/${e}`, {})}
            />
          )}
          {options.length === 0 && (
            <h4>There is no monitor data available for the selected time range</h4>
          )}
        </Fragment>
      );
    }}
  </Query>
);

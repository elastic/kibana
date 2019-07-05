/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React from 'react';
import { Query } from 'react-apollo';
import { LatestMonitor } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { MonitorList } from '../../functional/monitor_list';
import { getMonitorListQuery } from './get_monitor_list';

interface MonitorListProps {
  filters?: string;
}

type Props = MonitorListProps & UptimeCommonProps;

export const MonitorListQuery = ({
  autorefreshInterval,
  autorefreshIsPaused,
  colors: { primary, danger },
  dateRangeStart,
  dateRangeEnd,
  filters,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
    query={getMonitorListQuery}
    variables={{ dateRangeStart, dateRangeEnd, filters }}
  >
    {({ loading, error, data }) => {
      if (error) {
        return i18n.translate('xpack.uptime.monitorList.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const monitors: LatestMonitor[] | undefined = get(data, 'monitorStatus.monitors', undefined);
      return (
        <MonitorList
          dangerColor={danger}
          loading={loading}
          monitors={monitors || []}
          primaryColor={primary}
        />
      );
    }}
  </Query>
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { Query } from 'react-apollo';
import { MonitorPageTitle as TitleType } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { MonitorPageTitle } from '../../functional';
import { getMonitorPageTitle } from './get_monitor_page_title';

interface MonitorPageTitleProps {
  monitorId: string;
}

type Props = MonitorPageTitleProps & UptimeCommonProps;

export const MonitorPageTitleQuery = ({
  autorefreshInterval,
  autorefreshIsPaused,
  monitorId,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
    query={getMonitorPageTitle}
    variables={{ monitorId }}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return <EuiLoadingSpinner size="xl" />;
      }
      if (error) {
        return error;
      }
      const monitorPageTitle: TitleType = data.monitorPageTitle;
      return <MonitorPageTitle pageTitle={monitorPageTitle} />;
    }}
  </Query>
);

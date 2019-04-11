/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React from 'react';
import { Ping } from '../../../../common/graphql/types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../../lib/helper';
import { UptimeCommonProps } from '../../../uptime_app';
import { EmptyStatusBar, MonitorStatusBar } from '../../functional';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getMonitorStatusBarQuery } from './get_monitor_status_bar';

interface MonitorStatusBarQueryResult {
  monitorStatus?: Ping[];
}

interface MonitorStatusBarProps {
  monitorId: string;
}

type Props = MonitorStatusBarProps &
  UptimeCommonProps &
  UptimeGraphQLQueryProps<MonitorStatusBarQueryResult>;

const makeMonitorStatusBar = ({ monitorId, data }: Props) => {
  if (data && data.monitorStatus) {
    const { monitorStatus } = data;
    if (!monitorStatus.length) {
      return <EmptyStatusBar monitorId={monitorId} />;
    }
    const { monitor, timestamp, url } = monitorStatus[0];
    const status = get(monitor, 'status', undefined);
    const duration = microsToMillis(get(monitor, 'duration.us', null));
    const full = get(url, 'full', undefined);

    return (
      <MonitorStatusBar duration={duration} status={status} timestamp={timestamp} url={full} />
    );
  }
  return (
    <EmptyStatusBar
      message={i18n.translate('xpack.uptime.monitorStatusBar.loadingMessage', {
        defaultMessage: 'Loading…',
      })}
      monitorId={monitorId}
    />
  );
};

export const MonitorStatusBarQuery = withUptimeGraphQL<
  MonitorStatusBarQueryResult,
  MonitorStatusBarProps
>(makeMonitorStatusBar, getMonitorStatusBarQuery);

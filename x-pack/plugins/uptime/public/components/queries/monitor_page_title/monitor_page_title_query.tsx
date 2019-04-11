/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { MonitorPageTitle as TitleType } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { MonitorPageTitle } from '../../functional';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getMonitorPageTitleQuery } from './get_monitor_page_title';

interface MonitorPageTitleQueryResult {
  monitorPageTitle?: TitleType;
}

interface MonitorPageTitleProps {
  monitorId: string;
}

type Props = MonitorPageTitleProps &
  UptimeCommonProps &
  UptimeGraphQLQueryProps<MonitorPageTitleQueryResult>;

export const makeMonitorPageTitleQuery = ({ data }: Props) => {
  if (data && data.monitorPageTitle) {
    const { monitorPageTitle } = data;
    return <MonitorPageTitle pageTitle={monitorPageTitle} />;
  }
  return <EuiLoadingSpinner size="xl" />;
};

export const MonitorPageTitleQuery = withUptimeGraphQL<
  MonitorPageTitleQueryResult,
  MonitorPageTitleProps
>(makeMonitorPageTitleQuery, getMonitorPageTitleQuery);

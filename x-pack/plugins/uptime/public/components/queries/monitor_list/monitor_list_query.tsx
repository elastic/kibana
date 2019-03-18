/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { LatestMonitor } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { MonitorList } from '../../functional/monitor_list';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getMonitorListQuery } from './get_monitor_list';

interface MonitorListQueryResult {
  // TODO: clean up this ugly result data shape, there should be no nesting
  monitorStatus?: {
    monitors: LatestMonitor[];
  };
}

type Props = UptimeCommonProps & UptimeGraphQLQueryProps<MonitorListQueryResult>;

const makeMonitorListQuery = ({ colors: { success, danger }, data, loading }: Props) => {
  const monitors: LatestMonitor[] | undefined = get(data, 'monitorStatus.monitors');

  return (
    <MonitorList
      dangerColor={danger}
      loading={loading}
      monitors={monitors || []}
      successColor={success}
    />
  );
};

export const MonitorListQuery = withUptimeGraphQL<MonitorListQueryResult>(
  makeMonitorListQuery,
  getMonitorListQuery
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import moment from 'moment';
import { Ping } from '../../../../../../common/runtime_types';
import { MonitorFailedTests } from '../../monitor_details/monitor_errors/failed_tests';
import { useSelectedLocation } from '../../monitor_details/hooks/use_selected_location';

export const ErrorTimeline = ({ lastTestRun }: { lastTestRun?: Ping }) => {
  const location = useSelectedLocation();

  if (!lastTestRun) {
    return <EuiSkeletonText lines={3} />;
  }
  const diff = moment(lastTestRun.monitor.timespan?.lt).diff(
    moment(lastTestRun.monitor.timespan?.gte),
    'minutes'
  );
  const startedAt = lastTestRun?.state?.started_at;

  return (
    <MonitorFailedTests
      location={location}
      time={{
        from: moment(startedAt)
          .subtract(diff / 2, 'minutes')
          .toISOString(),
        to: moment(lastTestRun.timestamp)
          .add(diff / 2, 'minutes')
          .toISOString(),
      }}
      allowBrushing={false}
    />
  );
};

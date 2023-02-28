/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLoadingContent } from '@elastic/eui';
import moment from 'moment';
import { MonitorFailedTests } from '../../monitor_details/monitor_errors/failed_tests';

export const ErrorTimeline = ({
  startedAt,
  endsAt,
}: {
  startedAt?: string;
  endsAt?: string | null;
}) => {
  if (!startedAt) {
    return <EuiLoadingContent lines={3} />;
  }
  return (
    <MonitorFailedTests
      time={{ from: moment(startedAt).subtract(10, 'minutes').toISOString(), to: endsAt ?? 'now' }}
      allowBrushing={false}
    />
  );
};

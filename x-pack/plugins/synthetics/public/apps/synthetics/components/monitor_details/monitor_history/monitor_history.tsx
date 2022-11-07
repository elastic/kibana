/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useUrlParams } from '../../../hooks';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { MonitorStatusPanel } from '../monitor_status/monitor_status_panel';

export const MonitorHistory = () => {
  const [useGetUrlParams, updateUrlParams] = useUrlParams();
  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const handleStatusChartBrushed = useCallback(
    ({ fromUtc, toUtc }) => {
      updateUrlParams({ dateRangeStart: fromUtc, dateRangeEnd: toUtc });
    },
    [updateUrlParams]
  );

  return (
    <>
      <SyntheticsDatePicker fullWidth={true} />
      <EuiSpacer size="m" />
      <MonitorStatusPanel
        from={dateRangeStart}
        to={dateRangeEnd}
        showViewHistoryButton={false}
        periodCaption={''}
        brushable={true}
        onBrushed={handleStatusChartBrushed}
      />
      <EuiSpacer size="m" />
    </>
  );
};

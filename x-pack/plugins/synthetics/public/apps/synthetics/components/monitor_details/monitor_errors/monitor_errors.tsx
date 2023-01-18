/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useMonitorErrors } from '../hooks/use_monitor_errors';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useAbsoluteDate, useGetUrlParams } from '../../../hooks';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { ErrorsTabContent } from './errors_tab_content';

export const MonitorErrors = () => {
  const { errorStates, loading } = useMonitorErrors();

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const time = useAbsoluteDate({ from: dateRangeStart, to: dateRangeEnd });

  const monitorId = useMonitorQueryId();

  return (
    <>
      <SyntheticsDatePicker fullWidth={true} />
      <EuiSpacer size="m" />
      <ErrorsTabContent errorStates={errorStates} loading={loading} />
    </>
  );
};

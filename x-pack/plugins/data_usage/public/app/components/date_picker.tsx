/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import { useDatePickerContext } from '../hooks/use_date_picker';

export const DatePicker: React.FC = () => {
  const {
    startDate,
    endDate,
    isAutoRefreshActive,
    refreshInterval,
    setStartDate,
    setEndDate,
    setIsAutoRefreshActive,
    setRefreshInterval,
  } = useDatePickerContext();

  const onTimeChange = ({ start, end }: { start: string; end: string }) => {
    setStartDate(start);
    setEndDate(end);
    // Trigger API call or data refresh here
  };

  const onRefreshChange = ({
    isPaused,
    refreshInterval: onRefreshRefreshInterval,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) => {
    setIsAutoRefreshActive(!isPaused);
    setRefreshInterval(onRefreshRefreshInterval);
  };

  return (
    <EuiSuperDatePicker
      start={startDate}
      end={endDate}
      onTimeChange={onTimeChange}
      isPaused={!isAutoRefreshActive}
      refreshInterval={refreshInterval}
      onRefreshChange={onRefreshChange}
      showUpdateButton={true}
    />
  );
};

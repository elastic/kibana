/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import createContainer from 'constate';

const useDatePicker = () => {
  const [startDate, setStartDate] = useState<string>('now-24h');
  const [endDate, setEndDate] = useState<string>('now');
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(0);

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isAutoRefreshActive,
    setIsAutoRefreshActive,
    refreshInterval,
    setRefreshInterval,
  };
};

export const [DatePickerProvider, useDatePickerContext] = createContainer(useDatePicker);

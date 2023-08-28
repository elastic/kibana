/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker, type OnTimeChangeProps } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useAssetDetailsStateContext } from '../hooks/use_asset_details_state';
import { useDateRangeProviderContext } from '../hooks/use_date_range';

export const DatePicker = () => {
  const { onTabsStateChange } = useAssetDetailsStateContext();
  const { dateRange, setDateRange } = useDateRangeProviderContext();
  const onTimeChange = useCallback(
    ({ start, end, isInvalid }: OnTimeChangeProps) => {
      if (!isInvalid) {
        setDateRange({ from: start, to: end });
        if (onTabsStateChange) {
          onTabsStateChange({ dateRange: { from: start, to: end } });
        }
      }
    },
    [onTabsStateChange, setDateRange]
  );

  return (
    <EuiSuperDatePicker
      start={dateRange.from}
      end={dateRange.to}
      updateButtonProps={{ iconOnly: true }}
      onTimeChange={onTimeChange}
      width="full"
    />
  );
};

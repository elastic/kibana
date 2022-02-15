/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useUxUrlParams } from '../../../../context/url_params_context/use_ux_url_params';
import { useDateRangeRedirect } from '../../../../hooks/use_date_range_redirect';
import { DatePicker } from '../../../../../../observability/public';
import { clearCache } from '../../../../services/rest/call_api';

export function RumDatePicker() {
  const {
    urlParams: { rangeFrom, rangeTo, refreshPaused, refreshInterval },
    refreshTimeRange,
  } = useUxUrlParams();

  const { redirect, isDateRangeSet } = useDateRangeRedirect();

  if (!isDateRangeSet) {
    redirect();
  }

  return (
    <DatePicker
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      refreshPaused={refreshPaused}
      refreshInterval={refreshInterval}
      onTimeRangeRefresh={({ start, end }) => {
        clearCache();
        refreshTimeRange({ rangeFrom: start, rangeTo: end });
      }}
    />
  );
}

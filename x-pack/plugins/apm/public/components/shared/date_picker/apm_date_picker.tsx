/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { DatePicker } from '.';
import { useTimeRangeId } from '../../../context/time_range_id/use_time_range_id';
import {
  toBoolean,
  toNumber,
} from '../../../context/url_params_context/helpers';

export const DEFAULT_REFRESH_INTERVAL = 60000;

export function ApmDatePicker() {
  const { query } = useApmParams('/*');

  if (!('rangeFrom' in query)) {
    throw new Error('range not available in route parameters');
  }

  const {
    rangeFrom,
    rangeTo,
    refreshPaused: refreshPausedFromUrl = 'true',
    refreshInterval: refreshIntervalFromUrl,
  } = query;

  const refreshPaused = toBoolean(refreshPausedFromUrl);
  const refreshInterval =
    toNumber(refreshIntervalFromUrl) ?? DEFAULT_REFRESH_INTERVAL;

  const { incrementTimeRangeId } = useTimeRangeId();

  return (
    <DatePicker
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      refreshPaused={refreshPaused}
      refreshInterval={refreshInterval}
      onTimeRangeRefresh={() => {
        incrementTimeRangeId();
      }}
    />
  );
}

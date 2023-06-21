/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';

export const buildRollingTimeWindow = (
  params: Partial<SLOWithSummaryResponse['timeWindow']> = {}
): SLOWithSummaryResponse['timeWindow'] => {
  return {
    duration: '30d',
    type: 'rolling',
    ...params,
  };
};

export const buildCalendarAlignedTimeWindow = (
  params: Partial<SLOWithSummaryResponse['timeWindow']> = {}
): SLOWithSummaryResponse['timeWindow'] => {
  return {
    duration: '1M',
    type: 'calendarAligned',
    ...params,
  };
};

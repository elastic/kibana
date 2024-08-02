/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import moment from 'moment';
import { TimeRange } from './use_lens_definition';

// For a timeslice SLO
// When the date range is lower than 24 hours, we force the interval to be the timeslice window
// Greater than 24 hours, the 'auto' interval will be fine
export function getLensDefinitionInterval(dataTimeRange: TimeRange, slo: SLOWithSummaryResponse) {
  const dataTimeRangeDuration = moment(dataTimeRange.to).diff(moment(dataTimeRange.from), 'ms');
  const interval =
    timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) &&
    dataTimeRangeDuration <= 86400000 &&
    slo.objective?.timesliceWindow
      ? slo.objective.timesliceWindow
      : 'auto';

  return interval;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { unitOfTime } from 'moment';

export type MinimumTimeRangeOption = 'No minimum' | '1 week' | '1 month' | '3 months' | '6 months';

type MinimumTimeRange = Record<MinimumTimeRangeOption, { factor: number; unit: unitOfTime.Base }>;

export const MINIMUM_TIME_RANGE: MinimumTimeRange = {
  'No minimum': { factor: 0, unit: 'w' },
  '1 week': { factor: 1, unit: 'w' },
  '1 month': { factor: 1, unit: 'M' },
  '3 months': { factor: 3, unit: 'M' },
  '6 months': { factor: 6, unit: 'M' },
};

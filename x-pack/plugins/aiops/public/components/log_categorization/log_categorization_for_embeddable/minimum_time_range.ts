/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { unitOfTime } from 'moment';

export const DEFAULT_MINIMUM_TIME_RANGE_OPTION: MinimumTimeRangeOption = 'No minimum';

export type MinimumTimeRangeOption = 'No minimum' | '1 week' | '1 month' | '3 months' | '6 months';

type MinimumTimeRange = Record<
  MinimumTimeRangeOption,
  { label: string; factor: number; unit: unitOfTime.Base }
>;

export const MINIMUM_TIME_RANGE: MinimumTimeRange = {
  'No minimum': {
    label: i18n.translate('xpack.aiops.logCategorization.minimumTimeRange.noMin', {
      defaultMessage: 'Use range specified in time selector',
    }),
    factor: 0,
    unit: 'w',
  },
  '1 week': {
    label: i18n.translate('xpack.aiops.logCategorization.minimumTimeRange.1week', {
      defaultMessage: '1 week',
    }),
    factor: 1,
    unit: 'w',
  },
  '1 month': {
    label: i18n.translate('xpack.aiops.logCategorization.minimumTimeRange.1month', {
      defaultMessage: '1 month',
    }),
    factor: 1,
    unit: 'M',
  },
  '3 months': {
    label: i18n.translate('xpack.aiops.logCategorization.minimumTimeRange.3months', {
      defaultMessage: '3 months',
    }),
    factor: 3,
    unit: 'M',
  },
  '6 months': {
    label: i18n.translate('xpack.aiops.logCategorization.minimumTimeRange.6months', {
      defaultMessage: '6 months',
    }),
    factor: 6,
    unit: 'M',
  },
};

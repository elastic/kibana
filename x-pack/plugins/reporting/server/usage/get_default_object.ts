/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PDF_JOB_TYPE, PNG_JOB_TYPE, CSV_JOB_TYPE } from '../../common/constants';
import { FeatureAvailabilityMap, UsageObject } from './types';

export const getDefaultObject = (featureAvailability: FeatureAvailabilityMap): UsageObject => {
  const TIMERANGE_FIELDS = {
    _all: 0,
    [CSV_JOB_TYPE]: { available: featureAvailability[CSV_JOB_TYPE], total: 0 },
    [PNG_JOB_TYPE]: { available: featureAvailability[PNG_JOB_TYPE], total: 0 },
    [PDF_JOB_TYPE]: {
      available: featureAvailability[PDF_JOB_TYPE],
      total: 0,
      app: { visualization: 0, dashboard: 0 },
      layout: { print: 0, preserve_layout: 0 },
    },
    status: { completed: 0, failed: 0 },
  };

  return {
    available: true,
    enabled: true,
    browser_type: 'chromium',
    ...TIMERANGE_FIELDS,
    lastDay: TIMERANGE_FIELDS,
    last7Days: TIMERANGE_FIELDS,
  };
};

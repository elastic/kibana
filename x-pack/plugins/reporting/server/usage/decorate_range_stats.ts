/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultsDeep } from 'lodash';

import { CSV_JOB_TYPE, PDF_JOB_TYPE, PNG_JOB_TYPE } from '../../common/constants';
import { FeatureAvailabilityMap, RangeStats, ReportingFeature } from './';

export const decorateRangeStats = (
  range: RangeStats,
  featureAvailability: FeatureAvailabilityMap
): RangeStats => {
  const isAvailable = (feature: ReportingFeature) => {
    return featureAvailability[feature] != null ? featureAvailability[feature] : false;
  };

  return defaultsDeep({}, range, {
    _all: 0,
    [CSV_JOB_TYPE]: { available: isAvailable(CSV_JOB_TYPE), total: 0 },
    [PNG_JOB_TYPE]: { available: isAvailable(PNG_JOB_TYPE), total: 0 },
    [PDF_JOB_TYPE]: {
      available: isAvailable(PDF_JOB_TYPE),
      total: 0,
      app: { visualization: 0, dashboard: 0 },
      layout: { print: 0, preserve_layout: 0 },
    },
    status: { completed: 0, failed: 0 },
  });
};

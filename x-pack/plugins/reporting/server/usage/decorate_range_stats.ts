/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CSV_JOB_TYPE, PDF_JOB_TYPE, PNG_JOB_TYPE } from '../../common/constants';
import { AvailableTotal, FeatureAvailabilityMap, RangeStats, ReportingFeature } from './';

function getForFeature(
  range: Partial<RangeStats>,
  featureKey: ReportingFeature,
  featureAvailability: FeatureAvailabilityMap,
  additional?: any
): AvailableTotal & typeof additional {
  const isAvailable = (feature: ReportingFeature) =>
    featureAvailability[feature] != null ? featureAvailability[feature] : false;
  const jobType = range[featureKey] || { total: 0, ...additional };

  // merge the additional stats for the jobType
  type AdditionalType = { [K in keyof typeof additional]: K };
  const filledAdditional: AdditionalType = {};
  if (additional) {
    Object.keys(additional).forEach(k => {
      filledAdditional[k] = { ...additional[k], ...jobType[k] };
    });
  }

  return {
    available: isAvailable(featureKey),
    total: jobType.total,
    ...filledAdditional,
  };
}

/*
 * Decorate range stats (stats for last day, last 7 days, etc) with feature
 * availability booleans, and zero-filling for unused features
 */
export const decorateRangeStats = (
  range: Partial<RangeStats> = {},
  featureAvailability: FeatureAvailabilityMap
): RangeStats => {
  return {
    _all: range._all || 0,
    status: { completed: 0, failed: 0, ...range.status },
    [CSV_JOB_TYPE]: getForFeature(range, CSV_JOB_TYPE, featureAvailability),
    [PNG_JOB_TYPE]: getForFeature(range, PNG_JOB_TYPE, featureAvailability),
    [PDF_JOB_TYPE]: getForFeature(range, PDF_JOB_TYPE, featureAvailability, {
      app: { dashboard: 0, visualization: 0 },
      layout: { preserve_layout: 0, print: 0 },
    }),
  };
};

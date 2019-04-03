/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CSV_JOB_TYPE, PDF_JOB_TYPE, PNG_JOB_TYPE } from '../../common/constants';
import { FeatureAvailabilityMap, RangeStats, ReportingFeature } from './';

/*
 * Decorate range stats (stats for last day, last 7 days, etc) with feature
 * availability booleans
 */
export const decorateRangeStats = (
  range: RangeStats,
  featureAvailability: FeatureAvailabilityMap
): RangeStats => {
  const isAvailable = (feature: ReportingFeature) => {
    if (featureAvailability[feature] == null) {
      throw new Error(`undefined available: ${featureAvailability[feature]}`);
    }
    return featureAvailability[feature] != null ? featureAvailability[feature] : false;
  };

  const overall = {
    _all: range._all || 0,
    status: range.status || { completed: 0 },
  };

  return {
    ...overall,
    [CSV_JOB_TYPE]: {
      ...range[CSV_JOB_TYPE],
      available: isAvailable(CSV_JOB_TYPE),
    },
    [PNG_JOB_TYPE]: {
      ...range[PNG_JOB_TYPE],
      available: isAvailable(PNG_JOB_TYPE),
    },
    [PDF_JOB_TYPE]: {
      ...range[PDF_JOB_TYPE],
      available: isAvailable(PDF_JOB_TYPE),
    },
  };
};

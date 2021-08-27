/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { ALL_JOB_TYPES, DEPRECATED_JOB_TYPES, PDF_JOB_TYPE } from '../../common/constants';
import type { JobType } from '../../common/types';
import type { AvailableTotal, FeatureAvailabilityMap, RangeStats, StatusCounts } from './types';

type AvailableTotalPDFAdditional = Pick<AvailableTotal, 'app' | 'layout'>;

const jobTypeIsDeprecated = (jobType: string) => DEPRECATED_JOB_TYPES.includes(jobType);

function getAvailableTotal(
  range: Partial<RangeStats>,
  typeKey: JobType,
  featureAvailability: FeatureAvailabilityMap,
  additionalDefault?: AvailableTotalPDFAdditional
) {
  const isAvailable = (feature: JobType) => !!featureAvailability[feature];
  const defaultAvailableTotal: AvailableTotal = {
    available: true,
    total: 0,
    deprecated: 0,
    ...additionalDefault,
  };
  const jobType = range[typeKey] || defaultAvailableTotal;

  // merge the additional stats for the jobType
  const filledAdditional: AvailableTotalPDFAdditional = {};
  if (additionalDefault?.app) {
    filledAdditional.app = { ...additionalDefault.app, ...jobType.app };
  }
  if (additionalDefault?.layout) {
    filledAdditional.layout = { ...additionalDefault.layout, ...jobType.layout };
  }

  // if the type itself is deprecated, all jobs are deprecated, otherwise only some of them might be
  const deprecated = jobTypeIsDeprecated(typeKey) ? jobType.total : jobType.deprecated || 0;

  return {
    available: isAvailable(typeKey),
    total: jobType.total,
    deprecated,
    ...filledAdditional,
  };
}

/*
 * Decorates time-based range stats (stats for all time, status for last 7 days) with feature
 * availability booleans, and zero-filling for unused features
 *
 * This function builds the result object for all export types found in the
 * Reporting data, even if the type is unknown to this Kibana instance.
 */
export const decorateRangeStats = (
  rangeStats: Partial<RangeStats> = {},
  featureAvailability: FeatureAvailabilityMap
) => {
  const {
    _all: rangeAll,
    status: rangeStatus,
    statuses: rangeStatusByApp,
    ...rangeStatsBasic
  } = rangeStats;

  // combine the known types with any unknown type found in reporting data
  const jobTypes = uniq([ALL_JOB_TYPES, ...Object.keys(rangeStatsBasic)]) as JobType[];
  const jobTypeStats = jobTypes.reduce((accum, jobType) => {
    return {
      ...accum,
      [jobType]: getAvailableTotal(
        rangeStats,
        jobType,
        featureAvailability,
        jobType === PDF_JOB_TYPE ? additionalDefaultPDF : undefined
      ),
    };
  }, {}) as Pick<RangeStats, JobType>;

  const resultStats = {
    _all: rangeAll || 0,
    status: { ...statusCountsDefault, ...rangeStatus },
    statuses: rangeStatusByApp,
    ...jobTypeStats,
  } as RangeStats;

  return resultStats;
};

const statusCountsDefault: StatusCounts = { completed: 0, failed: 0, pending: 0, processing: 0 };

const additionalDefaultPDF: AvailableTotalPDFAdditional = {
  app: { dashboard: 0, visualization: 0 },
  layout: { preserve_layout: 0, print: 0, canvas: 0 },
};

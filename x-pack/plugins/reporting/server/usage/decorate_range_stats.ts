/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import {
  CSV_JOB_TYPE,
  CSV_JOB_TYPE_DEPRECATED,
  DEPRECATED_JOB_TYPES,
  PDF_JOB_TYPE,
  PNG_JOB_TYPE,
} from '../../common/constants';
import { AvailableTotal, ExportType, FeatureAvailabilityMap, RangeStats } from './types';

const jobTypeIsDeprecated = (jobType: string) => DEPRECATED_JOB_TYPES.includes(jobType);

function getForFeature(
  range: Partial<RangeStats>,
  typeKey: ExportType,
  featureAvailability: FeatureAvailabilityMap,
  additional?: any
): AvailableTotal & typeof additional {
  const isAvailable = (feature: ExportType) => !!featureAvailability[feature];
  const jobType = range[typeKey] || { total: 0, ...additional, deprecated: 0 };

  // merge the additional stats for the jobType
  type AdditionalType = { [K in keyof typeof additional]: K };
  const filledAdditional: AdditionalType = {};
  if (additional) {
    Object.keys(additional).forEach((k) => {
      filledAdditional[k] = { ...additional[k], ...jobType[k] };
    });
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
 * Decorates range stats (stats for last day, last 7 days, etc) with feature
 * availability booleans, and zero-filling for unused features
 *
 * This function builds the result object for all export types found in the
 * Reporting data, even if the type is unknown to this Kibana instance.
 */
export const decorateRangeStats = (
  rangeStats: Partial<RangeStats> = {},
  featureAvailability: FeatureAvailabilityMap
): RangeStats => {
  const {
    _all: rangeAll,
    status: rangeStatus,
    statuses: rangeStatusByApp,
    [PDF_JOB_TYPE]: rangeStatsPdf,
    ...rangeStatsBasic
  } = rangeStats;

  // combine the known types with any unknown type found in reporting data
  const keysBasic = uniq([
    CSV_JOB_TYPE,
    CSV_JOB_TYPE_DEPRECATED,
    PNG_JOB_TYPE,
    ...Object.keys(rangeStatsBasic),
  ]) as ExportType[];
  const rangeBasic = keysBasic.reduce((accum, currentKey) => {
    return {
      ...accum,
      [currentKey]: getForFeature(rangeStatsBasic, currentKey, featureAvailability),
    };
  }, {}) as Partial<RangeStats>;
  const rangePdf = {
    [PDF_JOB_TYPE]: getForFeature(rangeStats, PDF_JOB_TYPE, featureAvailability, {
      app: { dashboard: 0, visualization: 0 },
      layout: { preserve_layout: 0, print: 0 },
    }),
  };

  const resultStats = {
    _all: rangeAll || 0,
    status: { completed: 0, failed: 0, ...rangeStatus },
    statuses: rangeStatusByApp,
    ...rangePdf,
    ...rangeBasic,
  } as RangeStats;

  return resultStats;
};

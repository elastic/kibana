/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEPRECATED_JOB_TYPES } from '../../common/constants';
import { ExportTypesHandler } from './get_export_type_handler';
import { AvailableTotal, FeatureAvailabilityMap, RangeStats } from './types';

const jobTypeIsDeprecated = (jobType: string) => DEPRECATED_JOB_TYPES.includes(jobType);
const defaultTotalsForFeature: Omit<AvailableTotal, 'available'> = {
  total: 0,
  deprecated: 0,
  app: { 'canvas workpad': 0, search: 0, visualization: 0, dashboard: 0 },
  layout: { canvas: 0, print: 0, preserve_layout: 0 },
};

const isAvailable = (featureAvailability: FeatureAvailabilityMap, feature: string) =>
  !!featureAvailability[feature];

function getAvailableTotalForFeature(
  jobType: AvailableTotal,
  typeKey: string,
  featureAvailability: FeatureAvailabilityMap
): AvailableTotal {
  // if the type itself is deprecated, all jobs are deprecated, otherwise only some of them might be
  const deprecated = jobTypeIsDeprecated(typeKey) ? jobType.total : jobType.deprecated || 0;

  // merge the additional stats for the jobType
  const availableTotal: AvailableTotal = {
    available: isAvailable(featureAvailability, typeKey),
    total: jobType.total,
    deprecated,
    sizes: jobType.sizes,
    app: { ...defaultTotalsForFeature.app, ...jobType.app },
    layout: { ...defaultTotalsForFeature.layout, ...jobType.layout },
  };

  return availableTotal;
}

/*
 * Decorates range stats (stats for last day, last 7 days, etc) with feature
 * availability booleans, and zero-filling for unused features
 *
 * This function builds the result object for all export types found in the
 * Reporting data, even if the type is unknown to this Kibana instance.
 */
export const getExportStats = (
  rangeStatsInput: Partial<RangeStats> = {},
  featureAvailability: FeatureAvailabilityMap,
  exportTypesHandler: ExportTypesHandler
) => {
  const {
    _all: rangeAll,
    status: rangeStatus,
    statuses: rangeStatusByApp,
    output_size: outputSize,
    ...rangeStats
  } = rangeStatsInput;

  // combine the known types with any unknown type found in reporting data
  const statsForExportType = exportTypesHandler.getJobTypes().reduce((accum, exportType) => {
    const availableTotal = rangeStats[exportType as keyof typeof rangeStats];

    if (!availableTotal) {
      return {
        ...accum,
        [exportType]: {
          available: isAvailable(featureAvailability, exportType),
          ...defaultTotalsForFeature,
        },
      };
    }

    return {
      ...accum,
      [exportType]: getAvailableTotalForFeature(availableTotal, exportType, featureAvailability),
    };
  }, {});

  const resultStats = {
    ...statsForExportType,
    _all: rangeAll || 0,
    status: { completed: 0, failed: 0, ...rangeStatus },
    statuses: rangeStatusByApp,
    output_size: outputSize,
  } as RangeStats;

  return resultStats;
};

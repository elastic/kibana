/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEPRECATED_JOB_TYPES } from '../../common/constants';
import { ExportTypesHandler } from './get_export_type_handler';
import {
  AvailableTotal,
  ErrorCodeStats,
  FeatureAvailabilityMap,
  JobTypes,
  LayoutCounts,
  MetricsPercentiles,
  MetricsStats,
  RangeStats,
  SizePercentiles,
} from './types';

const jobTypeIsDeprecated = (jobType: keyof JobTypes) => DEPRECATED_JOB_TYPES.includes(jobType);
const defaultTotalsForFeature: Omit<AvailableTotal, 'available'> & { layout: LayoutCounts } = {
  total: 0,
  deprecated: 0,
  app: { 'canvas workpad': 0, search: 0, visualization: 0, dashboard: 0 },
  output_size: ['1.0', '5.0', '25.0', '50.0', '75.0', '95.0', '99.0'].reduce(
    (sps, p) => ({ ...sps, [p]: null }),
    {} as SizePercentiles
  ),
  layout: { canvas: 0, print: 0, preserve_layout: 0 },
};

const jobTypeIsPdf = (jobType: keyof JobTypes) => {
  return jobType === 'printable_pdf' || jobType === 'printable_pdf_v2';
};

const metricsPercentiles = ['50.0', '75.0', '95.0', '99.0'].reduce(
  (mps, p) => ({ ...mps, [p]: null }),
  {} as MetricsPercentiles
);

const metricsSets = {
  csv: { csv_rows: metricsPercentiles },
  png: { png_cpu: metricsPercentiles, png_memory: metricsPercentiles },
  pdf: {
    pdf_cpu: metricsPercentiles,
    pdf_memory: metricsPercentiles,
    pdf_pages: metricsPercentiles,
  },
};

const metricsForFeature: { [K in keyof JobTypes]: JobTypes[K]['metrics'] } = {
  csv_searchsource: metricsSets.csv,
  csv_searchsource_immediate: metricsSets.csv,
  PNG: metricsSets.png,
  PNGV2: metricsSets.png,
  printable_pdf: metricsSets.pdf,
  printable_pdf_v2: metricsSets.pdf,
};

type CombinedJobTypeStats = AvailableTotal & {
  metrics: Partial<MetricsStats>;
  error_codes?: Partial<ErrorCodeStats>;
  layout?: LayoutCounts;
};

const isAvailable = (featureAvailability: FeatureAvailabilityMap, feature: string) =>
  !!featureAvailability[feature];

function getAvailableTotalForFeature(
  jobType: CombinedJobTypeStats | undefined,
  exportType: keyof JobTypes,
  featureAvailability: FeatureAvailabilityMap
): AvailableTotal {
  // if the type itself is deprecated, all jobs are deprecated, otherwise only some of them might be
  const deprecated = jobTypeIsDeprecated(exportType) ? jobType?.total : jobType?.deprecated || 0;

  // merge given stats with defaults
  const availableTotal: CombinedJobTypeStats = {
    available: isAvailable(featureAvailability, exportType),
    total: jobType?.total || 0,
    deprecated,
    output_size: { ...defaultTotalsForFeature.output_size, ...jobType?.output_size },
    metrics: { ...metricsForFeature[exportType], ...jobType?.metrics },
    app: { ...defaultTotalsForFeature.app, ...jobType?.app },
    error_codes: jobType?.error_codes,
    layout: jobTypeIsPdf(exportType)
      ? { ...defaultTotalsForFeature.layout, ...jobType?.layout }
      : undefined,
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
  rangeStatsInput: Partial<RangeStats> | undefined,
  featureAvailability: FeatureAvailabilityMap,
  exportTypesHandler: ExportTypesHandler
): RangeStats => {
  if (!rangeStatsInput) {
    return {} as RangeStats;
  }

  const {
    _all: rangeAll,
    status: rangeStatus,
    statuses: rangeStatusByApp,
    output_size: outputSize,
    ...rangeStats
  } = rangeStatsInput;

  // combine the known types with any unknown type found in reporting data
  const statsForExportType = exportTypesHandler.getJobTypes().reduce(
    (accum, exportType) => ({
      ...accum,
      [exportType]: getAvailableTotalForFeature(
        rangeStats[exportType],
        exportType,
        featureAvailability
      ),
    }),
    {}
  );

  const resultStats = {
    ...statsForExportType,
    _all: rangeAll || 0,
    status: { completed: 0, failed: 0, ...rangeStatus },
    statuses: rangeStatusByApp,
    output_size: outputSize,
  } as RangeStats;

  return resultStats;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import {
  AppCounts,
  AvailableTotal,
  ByAppCounts,
  JobTypes,
  LayoutCounts,
  MetricsPercentiles,
  MetricsStats,
  RangeStats,
  ReportingUsageType,
  SizePercentiles,
} from './types';

const appCountsSchema: MakeSchemaFrom<AppCounts> = {
  search: { type: 'long' },
  'canvas workpad': { type: 'long' },
  dashboard: { type: 'long' },
  visualization: { type: 'long' },
};

const layoutCountsSchema: MakeSchemaFrom<LayoutCounts> = {
  canvas: { type: 'long' },
  print: { type: 'long' },
  preserve_layout: { type: 'long' },
};

const byAppCountsSchema: MakeSchemaFrom<ByAppCounts> = {
  csv_searchsource: appCountsSchema,
  csv_searchsource_immediate: appCountsSchema,
  PNG: appCountsSchema,
  PNGV2: appCountsSchema,
  printable_pdf: appCountsSchema,
  printable_pdf_v2: appCountsSchema,
};

const sizesSchema: MakeSchemaFrom<SizePercentiles> = {
  '1.0': { type: 'long' },
  '5.0': { type: 'long' },
  '25.0': { type: 'long' },
  '50.0': { type: 'long' },
  '75.0': { type: 'long' },
  '95.0': { type: 'long' },
  '99.0': { type: 'long' },
};

const metricsPercentilesSchema: MakeSchemaFrom<MetricsPercentiles> = {
  '50.0': { type: 'long' },
  '75.0': { type: 'long' },
  '95.0': { type: 'long' },
  '99.0': { type: 'long' },
};

const metricsSchemaCsv: MakeSchemaFrom<Pick<MetricsStats, 'csv_rows'>> = {
  csv_rows: metricsPercentilesSchema,
};

const metricsSchemaPng: MakeSchemaFrom<Pick<MetricsStats, 'png_cpu' | 'png_memory'>> = {
  png_cpu: metricsPercentilesSchema,
  png_memory: metricsPercentilesSchema,
};

const metricsSchemaPdf: MakeSchemaFrom<Pick<MetricsStats, 'pdf_cpu' | 'pdf_memory' | 'pdf_pages'>> =
  {
    pdf_cpu: metricsPercentilesSchema,
    pdf_memory: metricsPercentilesSchema,
    pdf_pages: metricsPercentilesSchema,
  };

const availableTotalSchema: MakeSchemaFrom<AvailableTotal> = {
  available: { type: 'boolean' },
  total: { type: 'long' },
  deprecated: { type: 'long' },
  sizes: sizesSchema,
  app: appCountsSchema,
};

const jobTypesSchema: MakeSchemaFrom<JobTypes> = {
  csv_searchsource: { ...availableTotalSchema, metrics: metricsSchemaCsv },
  csv_searchsource_immediate: { ...availableTotalSchema, metrics: metricsSchemaCsv },
  PNG: { ...availableTotalSchema, metrics: metricsSchemaPng },
  PNGV2: { ...availableTotalSchema, metrics: metricsSchemaPng },
  printable_pdf: { ...availableTotalSchema, layout: layoutCountsSchema, metrics: metricsSchemaPdf },
  printable_pdf_v2: {
    ...availableTotalSchema,
    layout: layoutCountsSchema,
    metrics: metricsSchemaPdf,
  },
};

const rangeStatsSchema: MakeSchemaFrom<RangeStats> = {
  ...jobTypesSchema,
  _all: { type: 'long' },
  status: {
    completed: { type: 'long' },
    completed_with_warnings: { type: 'long' },
    failed: { type: 'long' },
    pending: { type: 'long' },
    processing: { type: 'long' },
  },
  statuses: {
    completed: byAppCountsSchema,
    completed_with_warnings: byAppCountsSchema,
    failed: byAppCountsSchema,
    pending: byAppCountsSchema,
    processing: byAppCountsSchema,
  },
  output_size: sizesSchema,
};

export const reportingSchema: MakeSchemaFrom<ReportingUsageType> = {
  ...rangeStatsSchema,
  available: { type: 'boolean' },
  enabled: { type: 'boolean' },
  last7Days: rangeStatsSchema,
};

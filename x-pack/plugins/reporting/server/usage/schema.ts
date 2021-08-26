/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import type {
  AppCount,
  AppCounts,
  AvailableTotal,
  AvailableTotals,
  LayoutCount,
  RangeStats,
  ReportingUsageType,
  StatusByAppCounts,
  StatusCounts,
} from './types';

const appCountsSchema: MakeSchemaFrom<AppCount> = {
  'canvas workpad': { type: 'long' },
  dashboard: { type: 'long' },
  visualization: { type: 'long' },
};
const layoutCountsSchema: MakeSchemaFrom<LayoutCount> = {
  print: { type: 'long' },
  preserve_layout: { type: 'long' },
  canvas: { type: 'long' },
};
const countByAppSchema: MakeSchemaFrom<AppCounts> = {
  csv: appCountsSchema,
  csv_searchsource: appCountsSchema,
  PNG: appCountsSchema,
  printable_pdf: appCountsSchema,
  printable_pdf_v2: appCountsSchema,
  PNGV2: appCountsSchema,
};

const availableTotalSchema: MakeSchemaFrom<AvailableTotal> = {
  available: { type: 'boolean' },
  total: { type: 'long' },
  deprecated: { type: 'long' },
  app: appCountsSchema,
  layout: layoutCountsSchema,
};

const statusCountsSchema: MakeSchemaFrom<StatusCounts> = {
  completed: { type: 'long' },
  completed_with_warnings: { type: 'long' },
  failed: { type: 'long' },
  pending: { type: 'long' },
  processing: { type: 'long' },
};

const statusByAppCountsSchema: MakeSchemaFrom<StatusByAppCounts> = {
  completed: countByAppSchema,
  completed_with_warnings: countByAppSchema,
  failed: countByAppSchema,
  pending: countByAppSchema,
  processing: countByAppSchema,
};

const jobTypesSchema: MakeSchemaFrom<AvailableTotals> = {
  csv: availableTotalSchema,
  csv_searchsource: availableTotalSchema,
  PNG: availableTotalSchema,
  printable_pdf: availableTotalSchema,
  printable_pdf_v2: availableTotalSchema,
  PNGV2: availableTotalSchema,
};

const rangeStatsSchema: MakeSchemaFrom<RangeStats> = {
  _all: { type: 'long' },
  status: statusCountsSchema,
  statuses: statusByAppCountsSchema,
  ...jobTypesSchema,
};

export const reportingSchema: MakeSchemaFrom<ReportingUsageType> = {
  ...rangeStatsSchema,
  available: { type: 'boolean' },
  browser_type: { type: 'keyword' },
  enabled: { type: 'boolean' },
  last7Days: rangeStatsSchema,
};

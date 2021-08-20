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
  RangeStats,
  ReportingUsageType,
} from './types';

const appCountsSchema: MakeSchemaFrom<AppCounts> = {
  'canvas workpad': { type: 'long' },
  dashboard: { type: 'long' },
  visualization: { type: 'long' },
};

const byAppCountsSchema: MakeSchemaFrom<ByAppCounts> = {
  csv: appCountsSchema,
  csv_searchsource: appCountsSchema,
  PNG: appCountsSchema,
  printable_pdf: appCountsSchema,
};

const availableTotalSchema: MakeSchemaFrom<AvailableTotal> = {
  available: { type: 'boolean' },
  total: { type: 'long' },
  deprecated: { type: 'long' },
};

const jobTypesSchema: MakeSchemaFrom<JobTypes> = {
  csv: availableTotalSchema,
  csv_searchsource: availableTotalSchema,
  PNG: availableTotalSchema,
  printable_pdf: {
    ...availableTotalSchema,
    app: appCountsSchema,
    layout: {
      print: { type: 'long' },
      preserve_layout: { type: 'long' },
    },
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
};

export const reportingSchema: MakeSchemaFrom<ReportingUsageType> = {
  ...rangeStatsSchema,
  available: { type: 'boolean' },
  browser_type: { type: 'keyword' },
  enabled: { type: 'boolean' },
  last7Days: rangeStatsSchema,
};

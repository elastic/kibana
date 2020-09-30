/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import { AppCounts, AvailableTotal, JobTypes, RangeStats, ReportingUsageType } from './types';

const appCountsSchema: MakeSchemaFrom<AppCounts> = {
  'canvas workpad': { type: 'long' },
  dashboard: { type: 'long' },
  visualization: { type: 'long' },
};

const byAppCountsSchema: MakeSchemaFrom<RangeStats['statuses']['cancelled']> = {
  csv: appCountsSchema,
  PNG: appCountsSchema,
  printable_pdf: appCountsSchema,
};

const availableTotalSchema: MakeSchemaFrom<AvailableTotal> = {
  available: { type: 'boolean' },
  total: { type: 'long' },
};

const jobTypesSchema: MakeSchemaFrom<JobTypes> = {
  csv: availableTotalSchema,
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
    cancelled: { type: 'long' },
    completed: { type: 'long' },
    completed_with_warnings: { type: 'long' },
    failed: { type: 'long' },
    pending: { type: 'long' },
    processing: { type: 'long' },
  },
  statuses: {
    cancelled: byAppCountsSchema,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { filterQuery } from '../model/filter_query';
import { pagination } from '../model/pagination';
import { runtimeMappings } from '../model/runtime_mappings';
import { sort } from '../model/sort';
import { timerange } from '../model/timerange';

export const timelineEqlRequestOptionsSchema = z.object({
  defaultIndex: z.array(z.string()).optional(),
  timerange,
  sort,
  filterQuery,
  eventCategoryField: z.string().optional(),
  tiebreakerField: z.string().optional(),
  timestampField: z.string().optional(),
  fieldRequested: z.array(z.string()),
  size: z.number().optional(),
  pagination,
  runTimeMappings: runtimeMappings.optional(),
});

export type TimelineEqlRequestOptionsInput = z.input<typeof timelineEqlRequestOptionsSchema>;

export type TimelineEqlRequestOptions = z.infer<typeof timelineEqlRequestOptionsSchema>;

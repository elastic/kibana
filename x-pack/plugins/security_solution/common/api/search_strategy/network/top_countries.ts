/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { filterQuery } from '../model/filter_query';
import { requestOptionsPaginatedSchema } from '../model/request_paginated_options';
import { sort } from '../model/sort';
import { timerange } from '../model/timerange';
import { flowTarget } from './model/flow_target';
import { topTablesFields } from './model/top_tables_fields';

export const networkTopCountriesSchema = requestOptionsPaginatedSchema.extend({
  ip: z.string().ip().optional(),
  flowTarget,
  sort: sort
    .unwrap()
    .extend({
      field: topTablesFields,
    })
    .deepPartial()
    .optional(),
  filterQuery,
  timerange,
});

export type NetworkTopCountriesRequestOptions = z.infer<typeof networkTopCountriesSchema>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { language } from '../model/language';
import { runtimeMappings } from '../model/runtime_mappings';
import { sortItem } from '../model/sort';
import { requestPaginated } from './request_paginated';

export const timelineEventsAllSchema = requestPaginated.extend({
  authFilter: z.object({}).optional(),
  excludeEcsData: z.boolean().optional(),
  fieldRequested: z.array(z.string()),
  sort: z.array(
    sortItem.extend({
      esTypes: z.array(z.string()),
      type: z.string(),
    })
  ),
  filterQuery: z.string(),
  fields: z.array(
    z.union([
      z.string(),
      z.object({
        field: z.string(),
        include_unmapped: z.boolean(),
      }),
    ])
  ),
  filterStatus: z
    .union([z.literal('open'), z.literal('closed'), z.literal('acknowledged')])
    .optional(),
  runtimeMappings,
  language,
});

export type TimelineEventsAllOptions = z.infer<typeof timelineEventsAllSchema>;

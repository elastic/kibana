/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { indicatorSchema, rollingTimeWindowSchema } from '../schema';

const baseSLOSchema = t.type({
  id: t.string,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  time_window: rollingTimeWindowSchema,
  budgeting_method: t.literal('occurrences'),
  objective: t.type({
    target: t.number,
  }),
  created_at: t.string,
  updated_at: t.string,
});

export type SLO = t.TypeOf<typeof baseSLOSchema>;

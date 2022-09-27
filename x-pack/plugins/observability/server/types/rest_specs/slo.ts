/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  budgetingMethodSchema,
  indicatorSchema,
  objectiveSchema,
  timeWindowSchema,
} from '../schema';

const createSLOParamsSchema = t.type({
  body: t.type({
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    time_window: timeWindowSchema,
    budgeting_method: budgetingMethodSchema,
    objective: objectiveSchema,
  }),
});

const createSLOResponseSchema = t.type({
  id: t.string,
});

const deleteSLOParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
});

const getSLOParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
});

const getSLOResponseSchema = t.type({
  id: t.string,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  time_window: timeWindowSchema,
  budgeting_method: budgetingMethodSchema,
  objective: objectiveSchema,
});

type CreateSLOParams = t.TypeOf<typeof createSLOParamsSchema.props.body>;
type CreateSLOResponse = t.TypeOf<typeof createSLOResponseSchema>;

type GetSLOResponse = t.TypeOf<typeof getSLOResponseSchema>;

export { createSLOParamsSchema, deleteSLOParamsSchema, getSLOParamsSchema };
export type { CreateSLOParams, CreateSLOResponse, GetSLOResponse };

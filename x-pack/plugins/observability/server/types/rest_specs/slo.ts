/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  budgetingMethodSchema,
  dateType,
  errorBudgetSchema,
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

const findSLOParamsSchema = t.partial({
  query: t.partial({
    name_filter: t.string,
    page: t.string,
    per_page: t.string,
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
  summary: t.type({
    sli_value: t.number,
    error_budget: errorBudgetSchema,
  }),
  revision: t.number,
  created_at: dateType,
  updated_at: dateType,
});

const updateSLOParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
  body: t.partial({
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    time_window: timeWindowSchema,
    budgeting_method: budgetingMethodSchema,
    objective: objectiveSchema,
  }),
});

const updateSLOResponseSchema = t.type({
  id: t.string,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  time_window: timeWindowSchema,
  budgeting_method: budgetingMethodSchema,
  objective: objectiveSchema,
  created_at: dateType,
  updated_at: dateType,
});

const findSLOResponseSchema = t.type({
  page: t.number,
  per_page: t.number,
  total: t.number,
  results: t.array(
    t.type({
      id: t.string,
      name: t.string,
      description: t.string,
      indicator: indicatorSchema,
      time_window: timeWindowSchema,
      budgeting_method: budgetingMethodSchema,
      objective: objectiveSchema,
      revision: t.number,
      created_at: dateType,
      updated_at: dateType,
    })
  ),
});

type CreateSLOParams = t.TypeOf<typeof createSLOParamsSchema.props.body>;
type CreateSLOResponse = t.TypeOf<typeof createSLOResponseSchema>;
type GetSLOResponse = t.OutputOf<typeof getSLOResponseSchema>;
type UpdateSLOParams = t.TypeOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOResponse = t.OutputOf<typeof updateSLOResponseSchema>;
type FindSLOParams = t.TypeOf<typeof findSLOParamsSchema.props.query>;
type FindSLOResponse = t.OutputOf<typeof findSLOResponseSchema>;

export {
  createSLOParamsSchema,
  deleteSLOParamsSchema,
  getSLOParamsSchema,
  getSLOResponseSchema,
  updateSLOParamsSchema,
  updateSLOResponseSchema,
  findSLOParamsSchema,
  findSLOResponseSchema,
};
export type {
  CreateSLOParams,
  CreateSLOResponse,
  GetSLOResponse,
  UpdateSLOParams,
  UpdateSLOResponse,
  FindSLOParams,
  FindSLOResponse,
};

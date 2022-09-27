/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { budgetingMethodSchema, objectiveSchema, timeWindowSchema } from './common';
import { indicatorSchema } from './indicators';

export const storedSLOSchema = t.type({
  id: t.string,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  time_window: timeWindowSchema,
  budgeting_method: budgetingMethodSchema,
  objective: objectiveSchema,
  created_at: t.string,
  updated_at: t.string,
});

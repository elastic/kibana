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
  indicatorSchema,
  objectiveSchema,
  timeWindowSchema,
} from '../schema';

const sloSchema = t.type({
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
});

export { sloSchema };

type SLO = t.TypeOf<typeof sloSchema>;
type StoredSLO = t.OutputOf<typeof sloSchema>;

export type { SLO, StoredSLO };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { dateType, summarySchema } from './common';
import { durationType } from './duration';
import { indicatorSchema } from './indicators';
import { timeWindowSchema } from './time_window';

const occurrencesBudgetingMethodSchema = t.literal<string>('occurrences');
const timeslicesBudgetingMethodSchema = t.literal<string>('timeslices');

const budgetingMethodSchema = t.union([
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
]);

const objectiveSchema = t.intersection([
  t.type({ target: t.number }),
  t.partial({ timeslice_target: t.number, timeslice_window: durationType }),
]);

const settingsSchema = t.type({
  timestamp_field: t.string,
  sync_delay: durationType,
  frequency: durationType,
});

const optionalSettingsSchema = t.partial({ ...settingsSchema.props });

const sloSchema = t.type({
  id: t.string,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  time_window: timeWindowSchema,
  budgeting_method: budgetingMethodSchema,
  objective: objectiveSchema,
  settings: settingsSchema,
  revision: t.number,
  created_at: dateType,
  updated_at: dateType,
});

const sloWithSummarySchema = t.intersection([sloSchema, t.type({ summary: summarySchema })]);

export {
  budgetingMethodSchema,
  objectiveSchema,
  occurrencesBudgetingMethodSchema,
  optionalSettingsSchema,
  settingsSchema,
  sloSchema,
  sloWithSummarySchema,
  timeslicesBudgetingMethodSchema,
};

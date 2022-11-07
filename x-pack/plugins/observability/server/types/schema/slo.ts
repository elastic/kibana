/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { durationType } from './duration';

const occurencesBudgetingMethodSchema = t.literal<string>('occurrences');
const timeslicesBudgetingMethodSchema = t.literal<string>('timeslices');

const budgetingMethodSchema = t.union([
  occurencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
]);

const objectiveSchema = t.intersection([
  t.type({ target: t.number }),
  t.partial({ timeslice_target: t.number, timeslice_window: durationType }),
]);

export {
  budgetingMethodSchema,
  occurencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
  objectiveSchema,
};

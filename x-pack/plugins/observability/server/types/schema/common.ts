/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const ALL_VALUE = '*';

const allOrAnyString = t.union([t.literal(ALL_VALUE), t.string]);

const timeWindowSchema = t.type({
  duration: t.string,
  is_rolling: t.literal<boolean>(true),
});

const budgetingMethodSchema = t.literal<string>('occurrences');

const objectiveSchema = t.type({
  target: t.number,
});

export { allOrAnyString, timeWindowSchema, budgetingMethodSchema, objectiveSchema, ALL_VALUE };

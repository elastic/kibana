/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { aggregateRuleExecutionEvent } from '../common';

export const GetAggregateRuleExecutionEventsResponse = t.exact(
  t.type({
    events: t.array(aggregateRuleExecutionEvent),
    total: t.number,
  })
);

export type GetAggregateRuleExecutionEventsResponse = t.TypeOf<
  typeof GetAggregateRuleExecutionEventsResponse
>;

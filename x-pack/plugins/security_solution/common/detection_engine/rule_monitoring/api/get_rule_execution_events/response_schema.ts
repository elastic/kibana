/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PaginationResult } from '../../../schemas/common';
import { RuleExecutionEvent } from '../../model/execution_event';

/**
 * Response body of the API route.
 */
export type GetRuleExecutionEventsResponse = t.TypeOf<typeof GetRuleExecutionEventsResponse>;
export const GetRuleExecutionEventsResponse = t.exact(
  t.type({
    events: t.array(RuleExecutionEvent),
    pagination: PaginationResult,
  })
);

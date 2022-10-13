/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { RuleExecutionResult } from '../../model/execution_result';

/**
 * Response body of the API route.
 */
export type GetRuleExecutionResultsResponse = t.TypeOf<typeof GetRuleExecutionResultsResponse>;
export const GetRuleExecutionResultsResponse = t.exact(
  t.type({
    events: t.array(RuleExecutionResult),
    total: t.number,
  })
);

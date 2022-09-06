/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleExecutionResultMock } from '../../model/execution_result.mock';
import type { GetRuleExecutionResultsResponse } from './response_schema';

const getSomeResponse = (): GetRuleExecutionResultsResponse => {
  const results = ruleExecutionResultMock.getSomeResults();
  return {
    events: results,
    total: results.length,
  };
};

export const getRuleExecutionResultsResponseMock = {
  getSomeResponse,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleParams, CountCriteria, ExecutionTimeRange } from '.';
import { buildFiltersFromCriteria } from './query_helpers';

export const getESQueryForLogSpike = (
  params: Pick<RuleParams, 'timeSize' | 'timeUnit'> & { criteria: CountCriteria },
  timestampField: string,
  executionTimeRange?: ExecutionTimeRange
): object => {
  const { mustFilters, mustNotFilters } = buildFiltersFromCriteria(
    params,
    timestampField,
    executionTimeRange
  );

  const query = {
    bool: {
      filter: mustFilters,
      ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
    },
  };

  return query;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import {
  FindCspBenchmarkRuleRequest,
  FindCspBenchmarkRuleResponse,
} from '../../../common/types/latest';
import { useKibana } from '../../common/hooks/use_kibana';

import {
  CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  FIND_CSP_BENCHMARK_RULE_ROUTE_PATH,
} from '../../../common/constants';

export type RulesQuery = Pick<
  FindCspBenchmarkRuleRequest,
  'section' | 'search' | 'page' | 'perPage' | 'ruleNumber' | 'sortField' | 'sortOrder'
>;
export type RulesQueryResult = ReturnType<typeof useFindCspBenchmarkRule>;

export const useFindCspBenchmarkRule = (
  { search, page, perPage, section, ruleNumber, sortField, sortOrder }: RulesQuery,
  benchmarkId: string,
  benchmarkVersion?: string
) => {
  const { http } = useKibana().services;

  return useQuery(
    [
      CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
      {
        section,
        search,
        page,
        perPage,
        benchmarkId,
        benchmarkVersion,
        ruleNumber,
        sortField,
        sortOrder,
      },
    ],
    () => {
      return http.get<FindCspBenchmarkRuleResponse>(FIND_CSP_BENCHMARK_RULE_ROUTE_PATH, {
        query: {
          benchmarkId,
          page,
          perPage,
          search,
          section,
          benchmarkVersion,
          ruleNumber,
          sortField,
          sortOrder,
        },
        version: '3',
      });
    }
  );
};

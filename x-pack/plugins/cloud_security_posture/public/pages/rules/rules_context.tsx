/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useContext, useMemo, useEffect, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  FindCspBenchmarkRuleResponse,
  PageUrlParams,
} from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { RulesQuery, useFindCspBenchmarkRule } from './use_csp_benchmark_rules';
import { usePageSize } from '../../common/hooks/use_page_size';
import { LOCAL_STORAGE_PAGE_SIZE_RULES_KEY } from '../../common/constants';

// type Dispatch = (action: Action) => void;
interface RulesProviderProps {
  children: React.ReactNode;
}
interface RulesContextValue {
  allRules: FindCspBenchmarkRuleResponse | undefined;
  rulesQuery: RulesQuery;
  setRulesQuery: (query: Partial<RulesQuery>) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  page: number;
  setPage: (page: number) => void;
}

const RulesContext = createContext<RulesContextValue | undefined>(undefined);
const MAX_ITEMS_PER_PAGE = 10000;

// interface State {
//   rulesQuery: RulesQuery;
//   pageSize?: number;
//   page: number;
// }

// type Action =
//   | {
//       type: 'setRulesQuery';
//       value: Partial<RulesQuery>;
//     }
//   | { type: 'setPageSize'; value: number }
//   | { type: 'setPage'; value: number };

// function rulesReducer(state: State, action: Action) {
//   switch (action.type) {
//     case 'setRulesQuery': {
//       return { ...state, rulesQuery: { ...state.rulesQuery, ...action.value } };
//     }
//     case 'setPage': {
//       return { ...state, page: action.value };
//     }
//     case 'setPageSize': {
//       return { ...state, pageSize: action.value };
//     }
//     default: {
//       throw new Error(`Unhandled action type: ${action}`);
//     }
//   }
// }

// const initialState: State = {
//   page: 1,
//   pageSize: 10,
//   rulesQuery: {
//     section: undefined,
//     ruleNumber: undefined,
//     search: '',
//     page: 0,
//     perPage: 10,
//     sortField: 'metadata.benchmark.rule_number',
//     sortOrder: 'asc',
//   },
// };

export function RulesProvider({ children }: RulesProviderProps) {
  const params = useParams<PageUrlParams>();
  const { pageSize, setPageSize } = usePageSize(LOCAL_STORAGE_PAGE_SIZE_RULES_KEY);
  const [page, setPage] = useState(1);
  const [rulesQuery, setRulesQuery] = useState<RulesQuery>({
    section: undefined,
    ruleNumber: undefined,
    search: '',
    page: 0,
    perPage: pageSize || 10,
    sortField: 'metadata.benchmark.rule_number',
    sortOrder: 'asc',
  });

  const allRules = useFindCspBenchmarkRule(
    {
      page: 1,
      perPage: MAX_ITEMS_PER_PAGE,
      sortField: 'metadata.benchmark.rule_number',
      sortOrder: 'asc',
    },
    params.benchmarkId,
    params.benchmarkVersion
  );

  // This useEffect is in charge of auto paginating to the correct page of a rule from the url params
  useEffect(() => {
    const getPageByRuleId = () => {
      if (params.ruleId && allRules?.data?.items) {
        const ruleIndex = allRules?.data?.items.findIndex(
          (rule) => rule.metadata.id === params.ruleId
        );

        if (ruleIndex !== -1) {
          // Calculate the page based on the rule index and page size
          const rulePage = Math.floor(ruleIndex / pageSize);
          return rulePage;
        }
      }
      return 0;
    };

    setRulesQuery({
      ...rulesQuery,
      page: getPageByRuleId(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRules?.data?.items]);

  const setRulesQueryCallback = useCallback(
    () => (query: Partial<RulesQuery>) => {
      setRulesQuery({ ...rulesQuery, ...query });
    },
    [rulesQuery, setRulesQuery]
  );

  const setPageSizeCallback = useCallback(
    (value: number) => {
      if (value === pageSize) return;

      setPageSize(value);
      setRulesQuery({ ...rulesQuery, ...{ perPage: value } });
    },
    [rulesQuery, setPageSize, pageSize]
  );

  const setPageCallback = useCallback(
    (value: number) => {
      setPage(value);
    },
    [setPage]
  );

  const initialContextValue = useMemo(
    () => ({
      allRules: allRules.data,
      rulesQuery,
      setRulesQuery: setRulesQueryCallback,
      pageSize,
      setPageSize: setPageSizeCallback,
      page,
      setPage: setPageCallback,
    }),
    [
      allRules,
      rulesQuery,
      setRulesQueryCallback,
      pageSize,
      setPageSizeCallback,
      page,
      setPageCallback,
    ]
  );

  return <RulesContext.Provider value={initialContextValue}>{children}</RulesContext.Provider>;
}

export function useRules() {
  const context = useContext(RulesContext);
  if (context === undefined) {
    throw new Error('useRules must be used within a RulesProvider');
  }
  return context;
}

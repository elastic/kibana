/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useContext, useMemo, useEffect, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  CspBenchmarkRule,
  FindCspBenchmarkRuleResponse,
  PageUrlParams,
  RuleStateAttributes,
} from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { extractErrorMessage } from '@kbn/cloud-security-posture-common';
import { buildRuleKey } from '../../../common/utils/rules_states';
import { RulesQuery, useFindCspBenchmarkRule } from './use_csp_benchmark_rules';
import { usePageSize } from '../../common/hooks/use_page_size';
import { LOCAL_STORAGE_PAGE_SIZE_RULES_KEY } from '../../common/constants';
import { useCspGetRulesStates } from './use_csp_rules_state';

export interface CspBenchmarkRulesWithStates {
  metadata: CspBenchmarkRule['metadata'];
  state: 'muted' | 'unmuted';
}

interface RulesPageData {
  rules_page: CspBenchmarkRulesWithStates[];
  all_rules: CspBenchmarkRulesWithStates[];
  rules_map: Map<string, CspBenchmarkRulesWithStates>;
  total: number;
  error?: string;
  loading: boolean;
}

export type RulesState = RulesPageData & RulesQuery;

interface RulesProviderProps {
  children: React.ReactNode;
}
interface RulesContextValue {
  rulesQuery: RulesQuery;
  rulesPageData: RulesPageData;
  setRulesQuery: (query: Partial<RulesQuery>) => void;
  page: number;
  setPage: (page: number) => void;
  sectionList: string[] | undefined;
  ruleNumberSelectOptions: string[];
  sectionSelectOptions: string[];
  selectedRules: CspBenchmarkRulesWithStates[];
  setSelectedRules: (rules: CspBenchmarkRulesWithStates[]) => void;
  setSelectAllRules: () => void;
  setEnabledDisabledItemsFilter: (filter: string) => void;
  enabledDisabledItemsFilter: string;
  mutedRulesCount?: number;
  rulesFlyoutData: CspBenchmarkRulesWithStates;
}

const RulesContext = createContext<RulesContextValue | undefined>(undefined);
const MAX_ITEMS_PER_PAGE = 10000;

export function RulesProvider({ children }: RulesProviderProps) {
  const params = useParams<PageUrlParams>();
  const { pageSize, setPageSize } = usePageSize(LOCAL_STORAGE_PAGE_SIZE_RULES_KEY);
  const [page, setPage] = useState(1);
  const [rulesQuery, setRulesQuery] = useState<RulesQuery>({
    section: undefined,
    ruleNumber: undefined,
    search: '',
    page: 1,
    perPage: pageSize || 10,
    sortField: 'metadata.benchmark.rule_number',
    sortOrder: 'asc',
  });
  const [selectedRules, setSelectedRules] = useState<CspBenchmarkRulesWithStates[]>([]);
  const [enabledDisabledItemsFilter, setEnabledDisabledItemsFilter] = useState('no-filter');

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

  const setRulesQueryCallback = useCallback(
    (query: Partial<RulesQuery>) => {
      setRulesQuery({ ...rulesQuery, ...query });
      if (query.perPage) {
        // set the local storage page size
        setPageSize(query.perPage);
      }
    },
    [rulesQuery, setRulesQuery, setPageSize]
  );

  const setPageCallback = useCallback(
    (value: number) => {
      setPage(value);
    },
    [setPage]
  );

  const sectionList = useMemo(
    () => allRules?.data?.items.map((rule) => rule.metadata.section),
    [allRules]
  );

  const ruleNumberSelectOptions = useMemo(
    () =>
      allRules.data
        ? allRules.data.items.map((rule) => rule.metadata.benchmark.rule_number || '')
        : [],
    [allRules]
  );

  const sectionSelectOptions = [...new Set(sectionList)].sort((a, b) => {
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
  });

  const { data, status, error } = useFindCspBenchmarkRule(
    {
      section: rulesQuery.section,
      ruleNumber: rulesQuery.ruleNumber,
      search: rulesQuery.search,
      page: 1,
      perPage: MAX_ITEMS_PER_PAGE,
      sortField: 'metadata.benchmark.rule_number',
      sortOrder: rulesQuery.sortOrder,
    },
    params.benchmarkId,
    params.benchmarkVersion
  );

  const rulesStates = useCspGetRulesStates();

  const rulesWithStates = getRulesWithStates(data, rulesStates);

  const mutedRulesCount = rulesWithStates.filter((rule) => rule.state === 'muted').length;

  const filteredRulesWithStates = getFilteredRulesWithStates(
    rulesWithStates,
    enabledDisabledItemsFilter
  );

  const rulesPageData = useMemo(
    () => getRulesPageData(filteredRulesWithStates, status, error, rulesQuery),
    [filteredRulesWithStates, status, error, rulesQuery]
  );

  const setSelectAllRules = useCallback(() => {
    setSelectedRules(rulesPageData.all_rules);
  }, [rulesPageData.all_rules]);

  const rulesFlyoutData: CspBenchmarkRulesWithStates = useMemo(() => {
    const arrayRulesStates: RuleStateAttributes[] = Object.values(rulesStates.data || {});
    return {
      ...{
        state:
          arrayRulesStates.find((filteredRuleState) => filteredRuleState.rule_id === params.ruleId)
            ?.muted === true
            ? 'muted'
            : 'unmuted',
      },
      ...{
        metadata: allRules?.data?.items.find((rule) => rule.metadata.id === params.ruleId)
          ?.metadata!,
      },
    };
  }, [rulesStates, params.ruleId, allRules]);

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

  const contextValue = useMemo<RulesContextValue>(
    () => ({
      rulesQuery,
      rulesPageData,
      setRulesQuery: setRulesQueryCallback,
      page,
      setPage: setPageCallback,
      sectionList,
      ruleNumberSelectOptions,
      sectionSelectOptions,
      selectedRules,
      setSelectedRules,
      setSelectAllRules,
      setEnabledDisabledItemsFilter,
      enabledDisabledItemsFilter,
      mutedRulesCount,
      rulesFlyoutData,
    }),
    [
      rulesQuery,
      rulesPageData,
      setRulesQueryCallback,
      page,
      setPageCallback,
      sectionList,
      ruleNumberSelectOptions,
      sectionSelectOptions,
      selectedRules,
      setSelectedRules,
      setSelectAllRules,
      setEnabledDisabledItemsFilter,
      enabledDisabledItemsFilter,
      mutedRulesCount,
      rulesFlyoutData,
    ]
  );

  return <RulesContext.Provider value={contextValue}>{children}</RulesContext.Provider>;
}

const getFilteredRulesWithStates = (
  rulesWithStates: CspBenchmarkRulesWithStates[],
  enabledDisabledItemsFilter: string
) => {
  if (enabledDisabledItemsFilter === 'disabled')
    return rulesWithStates?.filter((rule) => rule?.state === 'muted');
  else if (enabledDisabledItemsFilter === 'enabled')
    return rulesWithStates?.filter((rule) => rule?.state === 'unmuted');
  else return rulesWithStates;
};

const getPage = (data: CspBenchmarkRulesWithStates[], { page, perPage }: RulesQuery) =>
  data.slice(page * perPage, (page + 1) * perPage);

const getRulesPageData = (
  data: CspBenchmarkRulesWithStates[],
  status: string,
  error: unknown,
  query: RulesQuery
): RulesPageData => {
  const page = getPage(data, query);

  return {
    loading: status === 'loading',
    error: error ? extractErrorMessage(error) : undefined,
    all_rules: data,
    rules_map: new Map(data.map((rule) => [rule.metadata.id, rule])),
    rules_page: page,
    total: data?.length || 0,
  };
};

export function useRules() {
  const context = useContext(RulesContext);
  if (context === undefined) {
    throw new Error('useRules must be used within a RulesProvider');
  }
  return context;
}

const getRulesWithStates = (
  data: FindCspBenchmarkRuleResponse | undefined,
  rulesStates: ReturnType<typeof useCspGetRulesStates>
): CspBenchmarkRulesWithStates[] => {
  if (!data) return [];

  return data.items
    .filter((rule: CspBenchmarkRule) => rule.metadata.benchmark.rule_number !== undefined)
    .map((rule: CspBenchmarkRule) => {
      const rulesKey = buildRuleKey(
        rule.metadata.benchmark.id,
        rule.metadata.benchmark.version,
        /* Rule number always exists* from 8.7 */
        rule.metadata.benchmark.rule_number!
      );

      const match = rulesStates?.data?.[rulesKey];
      const rulesState = match?.muted ? 'muted' : 'unmuted';

      return { ...rule, state: rulesState || 'unmuted' };
    });
};

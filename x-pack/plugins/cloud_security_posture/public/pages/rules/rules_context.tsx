/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useContext, useMemo, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  CspBenchmarkRule,
  FindCspBenchmarkRuleResponse,
  PageUrlParams,
  RuleStateAttributes,
} from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { extractErrorMessage } from '@kbn/cloud-security-posture-common';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  CHANGE_MULTIPLE_RULE_STATE,
  CHANGE_RULE_STATE,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { buildRuleKey } from '../../../common/utils/rules_states';
import { useFindCspBenchmarkRule } from './use_csp_benchmark_rules';
import {
  RuleStateAttributesWithoutStates,
  useChangeCspRuleState,
} from './use_change_csp_rule_state';
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

interface RulesProviderProps {
  children: React.ReactNode;
}
interface RulesContextValue {
  section: string[] | undefined;
  setSection: (section: string[] | undefined) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  sortField: string;
  setSortField: (sortField: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
  ruleNumber: string[] | undefined;
  setRuleNumber: (ruleNumber: string[] | undefined) => void;
  search: string;
  setSearch: (search: string) => void;
  rulesPageData: RulesPageData;
  // setRulesQuery: (query: Partial<RulesQuery>) => void;

  sectionList: string[] | undefined;
  ruleNumberSelectOptions: string[];
  sectionSelectOptions: string[];
  selectedRules: CspBenchmarkRulesWithStates[];
  setSelectedRules: (rules: CspBenchmarkRulesWithStates[]) => void;
  setSelectAllRules: () => void;
  setEnabledDisabledItemsFilter: (filter: string) => void;
  toggleRuleState: (rule: CspBenchmarkRulesWithStates) => void;
  toggleSelectedRulesStates: (state: 'mute' | 'unmute') => void;
  enabledDisabledItemsFilter: string;
  mutedRulesCount?: number;
  rulesFlyoutData: CspBenchmarkRulesWithStates;
}

const RulesContext = createContext<RulesContextValue | undefined>(undefined);
const MAX_ITEMS_PER_PAGE = 10000;

export function useRules() {
  const context = useContext(RulesContext);
  if (context === undefined) {
    throw new Error('useRules must be used within a RulesProvider');
  }
  return context;
}

export function RulesProvider({ children }: RulesProviderProps) {
  const params = useParams<PageUrlParams>();
  const { pageSize, setPageSize } = usePageSize(LOCAL_STORAGE_PAGE_SIZE_RULES_KEY);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('metadata.benchmark.rule_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [section, setSection] = useState<string[] | undefined>(undefined);
  const [ruleNumber, setRuleNumber] = useState<string[] | undefined>(undefined);
  const { mutate: mutateRuleState } = useChangeCspRuleState();
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
      section,
      ruleNumber,
      search,
      page,
      perPage: MAX_ITEMS_PER_PAGE,
      sortField: 'metadata.benchmark.rule_number',
      sortOrder,
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

  const toggleRuleState = useCallback(
    (rule: CspBenchmarkRulesWithStates) => {
      if (rule.metadata.benchmark.rule_number) {
        uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, CHANGE_RULE_STATE);
        const nextRuleStates = rule.state === 'muted' ? 'unmute' : 'mute';
        const rulesObjectRequest: RuleStateAttributesWithoutStates = {
          benchmark_id: rule.metadata.benchmark.id,
          benchmark_version: rule.metadata.benchmark.version,
          rule_number: rule.metadata.benchmark.rule_number,
          rule_id: rule.metadata.id,
        };
        mutateRuleState({
          newState: nextRuleStates,
          ruleIds: [rulesObjectRequest],
        });
      }
    },
    [mutateRuleState]
  );

  const toggleSelectedRulesStates = useCallback(
    (state: 'mute' | 'unmute') => {
      const bulkSelectedRules: RuleStateAttributesWithoutStates[] = selectedRules.map(
        (e: CspBenchmarkRulesWithStates) => ({
          benchmark_id: e?.metadata.benchmark.id,
          benchmark_version: e?.metadata.benchmark.version,
          rule_number: e?.metadata.benchmark.rule_number!,
          rule_id: e?.metadata.id,
        })
      );
      // Only do the API Call IF there are no undefined value for rule number in the selected rules
      if (!bulkSelectedRules.some((rule) => rule.rule_number === undefined)) {
        uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, CHANGE_MULTIPLE_RULE_STATE);
        mutateRuleState({
          newState: state,
          ruleIds: bulkSelectedRules,
        });
      }
      setSelectedRules([]);
    },
    [selectedRules, mutateRuleState]
  );

  const rulesPageData = useMemo(
    () => getRulesPageData(filteredRulesWithStates, status, error, page, pageSize),
    [filteredRulesWithStates, status, error, page, pageSize]
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
  // useEffect(() => {
  //   const getPageByRuleId = () => {
  //     if (params.ruleId && allRules?.data?.items) {
  //       const ruleIndex = allRules?.data?.items.findIndex(
  //         (rule) => rule.metadata.id === params.ruleId
  //       );

  //       if (ruleIndex !== -1) {
  //         // Calculate the page based on the rule index and page size
  //         const rulePage = Math.floor(ruleIndex / pageSize);
  //         return rulePage;
  //       }
  //     }
  //     return 1;
  //   };

  //   setPage(getPageByRuleId());
  // }, [allRules?.data?.items, params.ruleId, pageSize]);

  const contextValue = useMemo<RulesContextValue>(
    () => ({
      section,
      setSection,
      page,
      pageSize,
      setPageSize,
      sortField,
      setSortField,
      sortOrder,
      setSortOrder,
      ruleNumber,
      setRuleNumber,
      search,
      setSearch,
      rulesPageData,
      setPage,
      sectionList,
      ruleNumberSelectOptions,
      sectionSelectOptions,
      selectedRules,
      setSelectedRules,
      setSelectAllRules,
      setEnabledDisabledItemsFilter,
      toggleRuleState,
      toggleSelectedRulesStates,
      enabledDisabledItemsFilter,
      mutedRulesCount,
      rulesFlyoutData,
    }),
    [
      rulesPageData,
      sortField,
      setSortField,
      sortOrder,
      setSortOrder,
      pageSize,
      setPageSize,
      page,
      setPage,
      section,
      setSection,
      search,
      setSearch,
      sectionList,
      ruleNumber,
      setRuleNumber,
      ruleNumberSelectOptions,
      sectionSelectOptions,
      selectedRules,
      setSelectedRules,
      setSelectAllRules,
      setEnabledDisabledItemsFilter,
      enabledDisabledItemsFilter,
      toggleRuleState,
      toggleSelectedRulesStates,
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
  let rulesWithStatesFiltered = rulesWithStates;
  if (enabledDisabledItemsFilter === 'disabled')
    rulesWithStatesFiltered = rulesWithStates?.filter((rule) => rule?.state === 'muted');
  else if (enabledDisabledItemsFilter === 'enabled')
    rulesWithStatesFiltered = rulesWithStates?.filter((rule) => rule?.state === 'unmuted');

  return rulesWithStatesFiltered;
};

const getPage = (data: CspBenchmarkRulesWithStates[], page: number, perPage: number) =>
  data.slice(page * perPage, (page + 1) * perPage);

const getRulesPageData = (
  data: CspBenchmarkRulesWithStates[],
  status: string,
  error: unknown,
  page: number,
  perPage: number
): RulesPageData => {
  const pageIndex = getPage(data, page, perPage);

  return {
    loading: status === 'loading',
    error: error ? extractErrorMessage(error) : undefined,
    all_rules: data,
    rules_map: new Map(data.map((rule) => [rule.metadata.id, rule])),
    rules_page: pageIndex,
    total: data?.length || 0,
  };
};

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

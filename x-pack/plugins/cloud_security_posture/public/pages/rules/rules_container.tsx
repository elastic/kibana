/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import compareVersions from 'compare-versions';
import { EuiSpacer } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { buildRuleKey } from '../../../common/utils/rules_states';
import { extractErrorMessage } from '../../../common/utils/helpers';
import { RulesTable } from './rules_table';
import { RulesTableHeader } from './rules_table_header';
import { useFindCspBenchmarkRule, type RulesQuery } from './use_csp_benchmark_rules';
import * as TEST_SUBJECTS from './test_subjects';
import { RuleFlyout } from './rules_flyout';
import { LOCAL_STORAGE_PAGE_SIZE_RULES_KEY } from '../../common/constants';
import { usePageSize } from '../../common/hooks/use_page_size';
import type {
  CspBenchmarkRule,
  PageUrlParams,
  RuleStateAttributes,
} from '../../../common/types/latest';
import { useCspGetRulesStates } from './use_csp_rules_state';
import { RulesCounters } from './rules_counters';

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

const getRulesPage = (
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

const getPage = (data: CspBenchmarkRulesWithStates[], { page, perPage }: RulesQuery) =>
  data.slice(page * perPage, (page + 1) * perPage);

const MAX_ITEMS_PER_PAGE = 10000;

export const RulesContainer = () => {
  const params = useParams<PageUrlParams>();
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [enabledDisabledItemsFilter, setEnabledDisabledItemsFilter] = useState('no-filter');
  const { pageSize, setPageSize } = usePageSize(LOCAL_STORAGE_PAGE_SIZE_RULES_KEY);

  const [rulesQuery, setRulesQuery] = useState<RulesQuery>({
    section: undefined,
    ruleNumber: undefined,
    search: '',
    page: 0,
    perPage: pageSize || 10,
    sortField: 'metadata.benchmark.rule_number',
    sortOrder: 'asc',
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

  // We need to make this call again without the filters. this way the section list is always full
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

  const rulesStates = useCspGetRulesStates();
  const arrayRulesStates: RuleStateAttributes[] = Object.values(rulesStates.data || {});

  const filteredRulesStates: RuleStateAttributes[] = arrayRulesStates.filter(
    (ruleState: RuleStateAttributes) =>
      ruleState.benchmark_id === params.benchmarkId &&
      ruleState.benchmark_version === 'v' + params.benchmarkVersion
  );

  const rulesWithStates: CspBenchmarkRulesWithStates[] = useMemo(() => {
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
  }, [data, rulesStates?.data]);

  const mutedRulesCount = rulesWithStates.filter((rule) => rule.state === 'muted').length;

  const filteredRulesWithStates: CspBenchmarkRulesWithStates[] = useMemo(() => {
    if (enabledDisabledItemsFilter === 'disabled')
      return rulesWithStates?.filter((rule) => rule?.state === 'muted');
    else if (enabledDisabledItemsFilter === 'enabled')
      return rulesWithStates?.filter((rule) => rule?.state === 'unmuted');
    else return rulesWithStates;
  }, [rulesWithStates, enabledDisabledItemsFilter]);

  const sectionList = useMemo(
    () => allRules.data?.items.map((rule) => rule.metadata.section),
    [allRules.data]
  );

  const ruleNumberList = useMemo(
    () => allRules.data?.items.map((rule) => rule.metadata.benchmark.rule_number || ''),
    [allRules.data]
  );

  const cleanedSectionList = [...new Set(sectionList)].sort((a, b) => {
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
  });

  const cleanedRuleNumberList = [...new Set(ruleNumberList)].sort(compareVersions);

  const rulesPageData = useMemo(
    () => getRulesPage(filteredRulesWithStates, status, error, rulesQuery),
    [filteredRulesWithStates, status, error, rulesQuery]
  );

  const [selectedRules, setSelectedRules] = useState<CspBenchmarkRulesWithStates[]>([]);

  const setSelectAllRules = () => {
    setSelectedRules(rulesPageData.all_rules);
  };

  const rulesFlyoutData: CspBenchmarkRulesWithStates = {
    ...{
      state:
        filteredRulesStates.find(
          (filteredRuleState) => filteredRuleState.rule_id === selectedRuleId
        )?.muted === true
          ? 'muted'
          : 'unmuted',
    },
    ...{ metadata: rulesPageData.rules_map.get(selectedRuleId!)?.metadata! },
  };

  return (
    <div data-test-subj={TEST_SUBJECTS.CSP_RULES_CONTAINER}>
      <RulesCounters
        mutedRulesCount={mutedRulesCount}
        setEnabledDisabledItemsFilter={setEnabledDisabledItemsFilter}
      />
      <EuiSpacer />
      <RulesTableHeader
        onSectionChange={(value) =>
          setRulesQuery((currentQuery) => ({ ...currentQuery, section: value }))
        }
        onRuleNumberChange={(value) =>
          setRulesQuery((currentQuery) => ({ ...currentQuery, ruleNumber: value }))
        }
        sectionSelectOptions={cleanedSectionList}
        ruleNumberSelectOptions={cleanedRuleNumberList}
        search={(value) => setRulesQuery((currentQuery) => ({ ...currentQuery, search: value }))}
        searchValue={rulesQuery.search || ''}
        totalRulesCount={rulesPageData.all_rules.length}
        pageSize={rulesPageData.rules_page.length}
        isSearching={status === 'loading'}
        selectedRules={selectedRules}
        refetchRulesStates={rulesStates.refetch}
        setEnabledDisabledItemsFilter={setEnabledDisabledItemsFilter}
        enabledDisabledItemsFilterState={enabledDisabledItemsFilter}
        setSelectAllRules={setSelectAllRules}
        setSelectedRules={setSelectedRules}
      />
      <EuiSpacer />
      <RulesTable
        onSortChange={(value) =>
          setRulesQuery((currentQuery) => ({ ...currentQuery, sortOrder: value }))
        }
        rules_page={rulesPageData.rules_page}
        total={rulesPageData.total}
        error={rulesPageData.error}
        loading={rulesPageData.loading}
        perPage={pageSize || rulesQuery.perPage}
        page={rulesQuery.page}
        setPagination={(paginationQuery) => {
          setPageSize(paginationQuery.perPage);
          setRulesQuery((currentQuery) => ({ ...currentQuery, ...paginationQuery }));
        }}
        setSelectedRuleId={setSelectedRuleId}
        selectedRuleId={selectedRuleId}
        refetchRulesStates={rulesStates.refetch}
        selectedRules={selectedRules}
        setSelectedRules={setSelectedRules}
      />
      {selectedRuleId && (
        <RuleFlyout
          rule={rulesFlyoutData}
          onClose={() => setSelectedRuleId(null)}
          refetchRulesStates={rulesStates.refetch}
        />
      )}
    </div>
  );
};

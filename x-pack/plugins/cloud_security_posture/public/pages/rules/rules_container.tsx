/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useParams, useHistory, generatePath } from 'react-router-dom';
import type {
  CspBenchmarkRule,
  PageUrlParams,
  RuleStateAttributes,
} from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { extractErrorMessage } from '@kbn/cloud-security-posture-common';
import semVerCompare from 'semver/functions/compare';
import semVerCoerce from 'semver/functions/coerce';
import { benchmarksNavigation } from '../../common/navigation/constants';
import { buildRuleKey } from '../../../common/utils/rules_states';
import { RulesTable } from './rules_table';
import { RulesTableHeader } from './rules_table_header';
import { useFindCspBenchmarkRule, type RulesQuery } from './use_csp_benchmark_rules';
import * as TEST_SUBJECTS from './test_subjects';
import { RuleFlyout } from './rules_flyout';
import { useCspGetRulesStates } from './use_csp_rules_state';
import { RulesCounters } from './rules_counters';
import { useRules } from './rules_context';

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

const MAX_ITEMS_PER_PAGE = 10000;

export const RulesContainer = () => {
  const params = useParams<PageUrlParams>();
  const history = useHistory();
  const [enabledDisabledItemsFilter, setEnabledDisabledItemsFilter] = useState('no-filter');
  const { allRules, rulesQuery, pageSize } = useRules();

  const navToRuleFlyout = (ruleId: string) => {
    history.push(
      generatePath(benchmarksNavigation.rules.path, {
        benchmarkVersion: params.benchmarkVersion,
        benchmarkId: params.benchmarkId,
        ruleId,
      })
    );
  };

  const navToRulePage = () => {
    history.push(
      generatePath(benchmarksNavigation.rules.path, {
        benchmarkVersion: params.benchmarkVersion,
        benchmarkId: params.benchmarkId,
      })
    );
  };

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
  const arrayRulesStates: RuleStateAttributes[] = Object.values(rulesStates.data || {});

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
    () => allRules?.items.map((rule) => rule.metadata.section),
    [allRules]
  );

  const ruleNumberList = useMemo(
    () => allRules?.items.map((rule) => rule.metadata.benchmark.rule_number || ''),
    [allRules]
  );

  const cleanedSectionList = [...new Set(sectionList)].sort((a, b) => {
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
  });

  const cleanedRuleNumberList = [...new Set(ruleNumberList)].sort((a, b) =>
    semVerCompare(semVerCoerce(a) ?? '', semVerCoerce(b) ?? '')
  );

  const rulesPageData = useMemo(
    () => getRulesPageData(filteredRulesWithStates, status, error, rulesQuery),
    [filteredRulesWithStates, status, error, rulesQuery]
  );

  const [selectedRules, setSelectedRules] = useState<CspBenchmarkRulesWithStates[]>([]);

  const setSelectAllRules = () => {
    setSelectedRules(rulesPageData.all_rules);
  };

  const rulesFlyoutData: CspBenchmarkRulesWithStates = {
    ...{
      state:
        arrayRulesStates.find((filteredRuleState) => filteredRuleState.rule_id === params.ruleId)
          ?.muted === true
          ? 'muted'
          : 'unmuted',
    },
    ...{
      metadata: allRules?.items.find((rule) => rule.metadata.id === params.ruleId)?.metadata!,
    },
  };

  return (
    <div data-test-subj={TEST_SUBJECTS.CSP_RULES_CONTAINER}>
      <RulesCounters
        mutedRulesCount={mutedRulesCount}
        setEnabledDisabledItemsFilter={setEnabledDisabledItemsFilter}
      />
      <EuiSpacer />
      <RulesTableHeader
        sectionSelectOptions={cleanedSectionList}
        ruleNumberSelectOptions={cleanedRuleNumberList}
        searchValue={rulesQuery.search || ''}
        totalRulesCount={rulesPageData.all_rules.length}
        pageSize={rulesPageData.rules_page.length}
        isSearching={status === 'loading'}
        selectedRules={selectedRules}
        setEnabledDisabledItemsFilter={setEnabledDisabledItemsFilter}
        enabledDisabledItemsFilterState={enabledDisabledItemsFilter}
        setSelectAllRules={setSelectAllRules}
        setSelectedRules={setSelectedRules}
      />
      <EuiSpacer />
      <RulesTable
        rules_page={rulesPageData.rules_page}
        total={rulesPageData.total}
        error={rulesPageData.error}
        loading={rulesPageData.loading}
        perPage={pageSize || rulesQuery.perPage}
        selectedRuleId={params.ruleId}
        onRuleClick={navToRuleFlyout}
        selectedRules={selectedRules}
        setSelectedRules={setSelectedRules}
      />
      {params.ruleId && rulesFlyoutData.metadata && (
        <RuleFlyout rule={rulesFlyoutData} onClose={navToRulePage} />
      )}
    </div>
  );
};

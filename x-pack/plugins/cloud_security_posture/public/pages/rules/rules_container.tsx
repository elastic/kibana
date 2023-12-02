/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { CspRuleTemplate } from '../../../common/schemas';
import { extractErrorMessage } from '../../../common/utils/helpers';
import { RulesTable } from './rules_table';
import { RulesTableHeader } from './rules_table_header';
import { useFindCspRuleTemplates, type RulesQuery, type RulesQueryResult } from './use_csp_rules';
import * as TEST_SUBJECTS from './test_subjects';
import { RuleFlyout } from './rules_flyout';
import { LOCAL_STORAGE_PAGE_SIZE_RULES_KEY } from '../../common/constants';
import { usePageSize } from '../../common/hooks/use_page_size';

interface RulesPageData {
  rules_page: CspRuleTemplate[];
  all_rules: CspRuleTemplate[];
  rules_map: Map<string, CspRuleTemplate>;
  total: number;
  error?: string;
  loading: boolean;
}

export type RulesState = RulesPageData & RulesQuery;

const getRulesPageData = (
  { status, data, error }: Pick<RulesQueryResult, 'data' | 'status' | 'error'>,
  query: RulesQuery
): RulesPageData => {
  const rules = data?.items || ([] as CspRuleTemplate[]);

  const page = getPage(rules, query);

  return {
    loading: status === 'loading',
    error: error ? extractErrorMessage(error) : undefined,
    all_rules: rules,
    rules_map: new Map(rules.map((rule) => [rule.metadata.id, rule])),
    rules_page: page,
    total: data?.total || 0,
  };
};

const getPage = (data: CspRuleTemplate[], { page, perPage }: RulesQuery) =>
  data.slice(page * perPage, (page + 1) * perPage);

const MAX_ITEMS_PER_PAGE = 10000;

export type PageUrlParams = Record<'policyId' | 'packagePolicyId', string>;
export type PageUrlParamsVersion2 = Record<'benchmarkId' | 'benchmarkVersion', string>;

export const RulesContainer = () => {
  const params = useParams<PageUrlParamsVersion2>();

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const { pageSize, setPageSize } = usePageSize(LOCAL_STORAGE_PAGE_SIZE_RULES_KEY);
  const [rulesQuery, setRulesQuery] = useState<RulesQuery>({
    section: undefined,
    search: '',
    page: 0,
    perPage: pageSize || 10,
  });

  const { data, status, error } = useFindCspRuleTemplates(
    {
      section: rulesQuery.section,
      search: rulesQuery.search,
      page: 1,
      perPage: MAX_ITEMS_PER_PAGE,
    },
    params.benchmarkId,
    params.benchmarkVersion
  );

  const rulesPageData = useMemo(
    () => getRulesPageData({ data, error, status }, rulesQuery),
    [data, error, status, rulesQuery]
  );

  // We need to make this call again without the filters. this way the section list is always full
  const allRules = useFindCspRuleTemplates(
    {
      page: 1,
      perPage: MAX_ITEMS_PER_PAGE,
    },
    params.benchmarkId,
    params.benchmarkVersion
  );

  const sectionList = useMemo(
    () => allRules.data?.items.map((rule) => rule.metadata.section),
    [allRules.data]
  );
  const ruleNumberList = useMemo(
    () => allRules.data?.items.map((rule) => rule.metadata.benchmark.rule_number || ''),
    [allRules.data]
  );
  const cleanedSectionList = [...new Set(sectionList)];
  const cleanedRuleNumberList = [...new Set(ruleNumberList)];

  return (
    <div data-test-subj={TEST_SUBJECTS.CSP_RULES_CONTAINER}>
      <EuiPanel hasBorder={false} hasShadow={false}>
        <RulesTableHeader
          onSectionChange={(value) =>
            setRulesQuery((currentQuery) => ({ ...currentQuery, section: value }))
          }
          sectionSelectOptions={cleanedSectionList}
          ruleNumberSelectOptions={cleanedRuleNumberList}
          search={(value) => setRulesQuery((currentQuery) => ({ ...currentQuery, search: value }))}
          searchValue={rulesQuery.search || ''}
          totalRulesCount={rulesPageData.all_rules.length}
          pageSize={rulesPageData.rules_page.length}
          isSearching={status === 'loading'}
        />
        <EuiSpacer />
        <RulesTable
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
        />
      </EuiPanel>
      {selectedRuleId && (
        <RuleFlyout
          rule={rulesPageData.rules_map.get(selectedRuleId)!}
          onClose={() => setSelectedRuleId(null)}
        />
      )}
    </div>
  );
};

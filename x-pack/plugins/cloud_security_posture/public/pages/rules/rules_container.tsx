/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { type EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import { extractErrorMessage } from '../../../common/utils/helpers';
import { RulesTable } from './rules_table';
import { RulesBottomBar } from './rules_bottom_bar';
import { RulesTableHeader } from './rules_table_header';
import {
  useFindCspRules,
  useBulkUpdateCspRules,
  type RuleSavedObject,
  type RulesQuery,
  type RulesQueryResult,
} from './use_csp_rules';
import * as TEST_SUBJECTS from './test_subjects';

interface RulesPageData {
  rules_page: RuleSavedObject[];
  all_rules: RuleSavedObject[];
  rules_map: Map<string, RuleSavedObject>;
  total: number;
  error?: string;
  loading: boolean;
}

export type RulesState = RulesPageData & RulesQuery;

const getSimpleQueryString = (searchValue?: string): string =>
  searchValue ? `${searchValue}*` : '';

const getChangedRules = (
  baseRules: ReadonlyMap<string, RuleSavedObject>,
  currentChangedRules: ReadonlyMap<string, RuleSavedObject>,
  rulesToChange: readonly RuleSavedObject[]
): Map<string, RuleSavedObject> => {
  const changedRules = new Map(currentChangedRules);

  rulesToChange.forEach((ruleToChange) => {
    const baseRule = baseRules.get(ruleToChange.id);
    const changedRule = changedRules.get(ruleToChange.id);

    if (!baseRule) throw new Error('expected base rule to exists');

    const baseRuleChanged = baseRule.attributes.enabled !== ruleToChange.attributes.enabled;

    if (!changedRule && baseRuleChanged) changedRules.set(ruleToChange.id, ruleToChange);

    if (changedRule && !baseRuleChanged) changedRules.delete(ruleToChange.id);
  });

  return changedRules;
};

const getRulesPageData = (
  { status, data, error }: Pick<RulesQueryResult, 'data' | 'status' | 'error'>,
  changedRules: Map<string, RuleSavedObject>,
  query: RulesQuery
): RulesPageData => {
  const rules = data?.savedObjects || [];
  const page = getPage(rules, query);
  return {
    loading: status === 'loading',
    error: error ? extractErrorMessage(error) : undefined,
    all_rules: rules,
    rules_map: new Map(rules.map((rule) => [rule.id, rule])),
    rules_page: page.map((rule) => changedRules.get(rule.attributes.id) || rule),
    total: data?.total || 0,
  };
};

const getPage = (data: readonly RuleSavedObject[], { page, perPage }: RulesQuery) =>
  data.slice(page * perPage, (page + 1) * perPage);

const MAX_ITEMS_PER_PAGE = 10000;

export const RulesContainer = () => {
  const tableRef = useRef<EuiBasicTable>(null);
  const [changedRules, setChangedRules] = useState<Map<string, RuleSavedObject>>(new Map());
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);
  const [visibleSelectedRulesIds, setVisibleSelectedRulesIds] = useState<string[]>([]);
  const [rulesQuery, setRulesQuery] = useState<RulesQuery>({ page: 0, perPage: 5, search: '' });

  const { data, status, error, refetch } = useFindCspRules({
    search: getSimpleQueryString(rulesQuery.search),
    page: 1,
    perPage: MAX_ITEMS_PER_PAGE,
  });

  const { mutate: bulkUpdate, isLoading: isUpdating } = useBulkUpdateCspRules();

  const rulesPageData = useMemo(
    () => getRulesPageData({ data, error, status }, changedRules, rulesQuery),
    [data, error, status, changedRules, rulesQuery]
  );

  const hasChanges = !!changedRules.size;

  const selectAll = () => {
    if (!tableRef.current) return;
    tableRef.current.setSelection(rulesPageData.rules_page);
    setIsAllSelected(true);
  };

  const toggleRules = (rules: RuleSavedObject[], enabled: boolean) =>
    setChangedRules(
      getChangedRules(
        rulesPageData.rules_map,
        changedRules,
        rules.map((rule) => ({
          ...rule,
          attributes: { ...rule.attributes, enabled },
        }))
      )
    );

  const bulkToggleRules = (enabled: boolean) =>
    toggleRules(
      isAllSelected
        ? rulesPageData.all_rules
        : visibleSelectedRulesIds.map((ruleId) => rulesPageData.rules_map.get(ruleId)!),
      enabled
    );

  const toggleRule = (rule: RuleSavedObject) => toggleRules([rule], !rule.attributes.enabled);

  const bulkUpdateRules = () => bulkUpdate([...changedRules].map(([, rule]) => rule.attributes));

  const discardChanges = useCallback(() => setChangedRules(new Map()), []);

  const clearSelection = useCallback(() => {
    if (!tableRef.current) return;
    tableRef.current.setSelection([]);
    setIsAllSelected(false);
  }, []);

  useEffect(discardChanges, [data, discardChanges]);
  useEffect(clearSelection, [rulesQuery, clearSelection]);

  return (
    <div data-test-subj={TEST_SUBJECTS.CSP_RULES_CONTAINER}>
      <EuiPanel hasBorder hasShadow={false}>
        <RulesTableHeader
          search={(value) => setRulesQuery((currentQuery) => ({ ...currentQuery, search: value }))}
          refresh={() => {
            clearSelection();
            refetch();
          }}
          bulkEnable={() => bulkToggleRules(true)}
          bulkDisable={() => bulkToggleRules(false)}
          selectAll={selectAll}
          clearSelection={clearSelection}
          selectedRulesCount={
            isAllSelected ? rulesPageData.all_rules.length : visibleSelectedRulesIds.length
          }
          searchValue={rulesQuery.search}
          totalRulesCount={rulesPageData.all_rules.length}
          isSearching={status === 'loading'}
        />
        <EuiSpacer />
        <RulesTable
          rules_page={rulesPageData.rules_page}
          total={rulesPageData.total}
          error={rulesPageData.error}
          loading={rulesPageData.loading}
          perPage={rulesQuery.perPage}
          page={rulesQuery.page}
          tableRef={tableRef}
          toggleRule={toggleRule}
          setSelectedRules={(rules) => {
            setIsAllSelected(false);
            setVisibleSelectedRulesIds(rules.map((rule) => rule.id));
          }}
          setPagination={(paginationQuery) =>
            setRulesQuery((currentQuery) => ({ ...currentQuery, ...paginationQuery }))
          }
        />
      </EuiPanel>
      {hasChanges && (
        <RulesBottomBar onSave={bulkUpdateRules} onCancel={discardChanges} isLoading={isUpdating} />
      )}
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { type EuiBasicTable, EuiPanel, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  extractErrorMessage,
  createCspRuleSearchFilterByPackagePolicy,
  isNonNullable,
} from '../../../common/utils/helpers';
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
import { RuleFlyout } from './rules_flyout';
import { useKibana } from '../../common/hooks/use_kibana';

interface RulesPageData {
  rules_page: RuleSavedObject[];
  all_rules: RuleSavedObject[];
  rules_map: Map<string, RuleSavedObject>;
  total: number;
  error?: string;
  loading: boolean;
  lastModified: string | null;
}

export type RulesState = RulesPageData & RulesQuery;

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
    rules_page: page.map((rule) => changedRules.get(rule.id) || rule),
    total: data?.total || 0,
    lastModified: getLastModified(rules) || null,
  };
};

const getLastModified = (data: RuleSavedObject[]): string | undefined =>
  data
    .map((v) => v.updatedAt)
    .filter(isNonNullable)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

const getPage = (data: readonly RuleSavedObject[], { page, perPage }: RulesQuery) =>
  data.slice(page * perPage, (page + 1) * perPage);

const MAX_ITEMS_PER_PAGE = 10000;

export type PageUrlParams = Record<'policyId' | 'packagePolicyId', string>;

export const RulesContainer = () => {
  const canUpdate = !!useKibana().services.application.capabilities.siem.crud;
  const params = useParams<PageUrlParams>();
  const tableRef = useRef<EuiBasicTable>(null);
  const [changedRules, setChangedRules] = useState<Map<string, RuleSavedObject>>(new Map());
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);
  const [visibleSelectedRulesIds, setVisibleSelectedRulesIds] = useState<string[]>([]);
  const [rulesQuery, setRulesQuery] = useState<RulesQuery>({
    filter: createCspRuleSearchFilterByPackagePolicy({
      packagePolicyId: params.packagePolicyId,
      policyId: params.policyId,
    }),
    search: '',
    page: 0,
    perPage: 10,
  });

  const { data, status, error, refetch } = useFindCspRules({
    filter: rulesQuery.filter,
    search: rulesQuery.search,
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

  const bulkUpdateRules = () =>
    bulkUpdate({
      savedObjectRules: [...changedRules].map(([, savedObjectRule]) => savedObjectRule),
      packagePolicyId: params.packagePolicyId,
    });

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
      <EuiCallOut
        size="m"
        title={i18n.translate('xpack.csp.rules.rulesContainerCallout.dataUpdateCalloutTitle', {
          defaultMessage:
            'Please note, any changes to your benchmark rules will take effect the next time your resources are evaluated. This can take up to ~5 hours',
        })}
        iconType="iInCircle"
      />
      <EuiSpacer />
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
          lastModified={rulesPageData.lastModified}
          canUpdate={canUpdate}
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
          setSelectedRuleId={setSelectedRuleId}
          selectedRuleId={selectedRuleId}
          canUpdate={canUpdate}
        />
      </EuiPanel>
      {hasChanges && (
        <RulesBottomBar onSave={bulkUpdateRules} onCancel={discardChanges} isLoading={isUpdating} />
      )}
      {selectedRuleId && (
        <RuleFlyout
          rule={changedRules.get(selectedRuleId) || rulesPageData.rules_map.get(selectedRuleId)!}
          onClose={() => setSelectedRuleId(null)}
          toggleRule={toggleRule}
          canUpdate={canUpdate}
        />
      )}
    </div>
  );
};

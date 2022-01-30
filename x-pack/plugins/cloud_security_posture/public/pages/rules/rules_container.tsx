/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiBottomBar, EuiButton } from '@elastic/eui';
import { SavedObject } from 'src/core/types';
import { RulesTable } from './rules_table';
import { RulesTableHeader } from './rules_table_header';
import type { CspRuleSchema } from '../../../common/schemas/csp_rule';
import { useCspRules, type UseCspRulesResult, type UseCspRulesOptions } from './use_csp_rules';
import * as TEST_SUBJECTS from './test_subjects';
import * as TEXT from './translations';

type RulesResult = UseCspRulesResult['rulesResult'];
type FetchProps = 'data' | 'error' | 'status';

// Require pagination and search params. searchFields restricted to 'name'
type RulesQuery = Required<Omit<UseCspRulesOptions, 'searchFields'>>;
export type RulesState = RuleLocalState & RulesQuery;
export type RuleSavedObject = SavedObject<CspRuleSchema>;

// Raw rules response
type RuleFetchState =
  | Pick<Extract<RulesResult, { status: 'idle' }>, FetchProps>
  | Pick<Extract<RulesResult, { status: 'loading' }>, FetchProps>
  | Pick<Extract<RulesResult, { status: 'error' }>, FetchProps>
  | Pick<Extract<RulesResult, { status: 'success' }>, FetchProps>;

// Transformed rules response:
// - data is the saved object collection with local changed rules
type RuleLocalState =
  | Exclude<RuleFetchState, { status: 'success' }>
  | {
      status: 'success';
      error: null;
      data: readonly RuleSavedObject[] | undefined;
      total: number;
    };

// TODO: move
const getErrorMessage = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return TEXT.UNKNOWN_ERROR;
};

const getRulesData = (
  data: Extract<RulesResult, { status: 'success' }>['data'],
  changedRules: ReadonlyMap<string, RuleSavedObject>
): readonly RuleSavedObject[] =>
  data?.savedObjects.map((v) => changedRules.get(v.attributes.id) || v) || [];

const getSimpleQueryString = (searchValue?: string): string =>
  searchValue ? `${searchValue}*` : '';

const getToggledRule = (rule: RuleSavedObject, enabled: boolean): RuleSavedObject => ({
  ...rule,
  attributes: {
    ...rule.attributes,
    enabled,
  },
});

const getRulesLocalState = (
  rulesResult: UseCspRulesResult['rulesResult'],
  changedRules: ReadonlyMap<string, RuleSavedObject>
): RuleLocalState => {
  switch (rulesResult.status) {
    case 'success':
      return {
        ...rulesResult,
        data: getRulesData(rulesResult.data, changedRules),
        total: rulesResult.data?.total || 0,
      };
    case 'error': {
      return {
        ...rulesResult,
        error: getErrorMessage(rulesResult.error),
      };
    }
    default:
      return rulesResult;
  }
};

const isUpdatedRule = (changedRule: RuleSavedObject, currentRule?: RuleSavedObject): boolean =>
  !!currentRule && currentRule.attributes.enabled !== changedRule.attributes.enabled;

const getChangedRules = (
  rules: readonly RuleSavedObject[],
  currentChangedRules: ReadonlyMap<string, RuleSavedObject>,
  rulesToChange: readonly RuleSavedObject[]
): Map<string, RuleSavedObject> => {
  const rawRules = new Map(rules.map((rule) => [rule.id, rule]));
  const changedRules = new Map(currentChangedRules);

  rulesToChange.forEach((ruleToChange) => {
    const changedRule = changedRules.get(ruleToChange.id);

    if (!changedRule && isUpdatedRule(ruleToChange, rawRules.get(ruleToChange.id)))
      changedRules.set(ruleToChange.id, ruleToChange);

    if (changedRule && isUpdatedRule(ruleToChange, changedRule))
      changedRules.delete(ruleToChange.id);
  });

  return changedRules;
};

export const RulesContainer = () => {
  const [changedRules, setChangedRules] = useState<Map<string, RuleSavedObject>>(new Map());
  const [selectedRules, setSelectedRules] = useState<RuleSavedObject[]>([]);
  const [rulesQuery, setRulesQuery] = useState<RulesQuery>({ page: 1, perPage: 10, search: '' });

  const {
    rulesResult,
    bulkUpdateRulesResult: { mutate: bulkUpdate, isLoading: isUpdating },
  } = useCspRules({
    ...rulesQuery,
    search: getSimpleQueryString(rulesQuery.search),
    searchFields: ['name'],
  });

  // Rules from server
  const rulesRawData = useMemo(
    () => (rulesResult.status === 'success' ? getRulesData(rulesResult.data, new Map()) : []),
    [rulesResult.data, rulesResult.status]
  );

  // Rules from server with local changes applied
  const rulesState = useMemo(
    () => getRulesLocalState(rulesResult, changedRules),
    // Exhaustive deps are ignored here because 'ruleResult' is not stable. see https://github.com/tannerlinsley/react-query/issues/1816
    // instead we listen to 'rulesResult.status'
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rulesResult.status, changedRules]
  );

  const hasChanges = !!changedRules.size;

  const bulkUpdateRules = () =>
    bulkUpdate(Array.from(changedRules.values()).map((v) => v.attributes));

  const localUpdateRules = (updatedRules: RuleSavedObject[]) =>
    setChangedRules((rules) => getChangedRules(rulesRawData, rules, updatedRules));

  const bulkChange = (enabled: boolean) =>
    localUpdateRules(selectedRules.map((rule) => getToggledRule(rule, enabled)));

  const toggleRule = (rule: RuleSavedObject) =>
    localUpdateRules([getToggledRule(rule, !rule.attributes.enabled)]);

  const discardChanges = useCallback(() => setChangedRules(new Map()), []);

  useEffect(discardChanges, [rulesRawData, discardChanges]);

  return (
    <div data-test-subj={TEST_SUBJECTS.CSP_RULES_CONTAINER}>
      <EuiPanel hasBorder hasShadow={false}>
        <RulesTableHeader
          search={(value) => setRulesQuery((currentQuery) => ({ ...currentQuery, search: value }))}
          refresh={rulesResult.refetch}
          bulkEnable={() => bulkChange(true)}
          bulkDisable={() => bulkChange(false)}
          selectedRulesCount={selectedRules.length}
          searchValue={rulesQuery.search}
          isSearching={rulesState.status === 'loading'}
        />
        <RulesTable
          {...rulesState}
          {...rulesQuery}
          toggleRule={toggleRule}
          setSelectedRules={setSelectedRules}
          setPagination={(paginationQuery) =>
            setRulesQuery((currentQuery) => ({ ...currentQuery, ...paginationQuery }))
          }
        />
      </EuiPanel>
      {!!hasChanges && (
        <RulesBottomBar onSave={bulkUpdateRules} onCancel={discardChanges} isLoading={isUpdating} />
      )}
    </div>
  );
};

interface RulesBottomBarProps {
  onSave(): void;
  onCancel(): void;
  isLoading: boolean;
}

const RulesBottomBar = ({ onSave, onCancel, isLoading }: RulesBottomBarProps) => (
  <EuiBottomBar>
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButton size="m" iconType="cross" isLoading={isLoading} onClick={onCancel} color="ghost">
          {TEXT.CANCEL}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="m"
          iconType="save"
          isLoading={isLoading}
          onClick={onSave}
          fill
          data-test-subj={TEST_SUBJECTS.CSP_RULES_SAVE_BUTTON}
        >
          {TEXT.SAVE}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiBottomBar>
);

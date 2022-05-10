/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useState, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { Rule, Pagination } from '../../types';
import { loadRules, LoadRulesProps } from '../lib/rule_api';
import { useKibana } from '../../common/lib/kibana';

interface RuleState {
  isLoading: boolean;
  data: Rule[];
  totalItemCount: number;
}

type UseLoadRulesProps = Omit<LoadRulesProps, 'http'> & {
  hasAnyAuthorizedRuleType: boolean;
  onPage: (pagination: Pagination) => void;
  onError: (message: string) => void;
};

export function useLoadRules({
  page,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
  sort,
  hasAnyAuthorizedRuleType,
  onPage,
  onError,
}: UseLoadRulesProps) {
  const { http } = useKibana().services;

  const [rulesState, setRulesState] = useState<RuleState>({
    isLoading: false,
    data: [],
    totalItemCount: 0,
  });

  const [noData, setNoData] = useState<boolean>(true);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);

  const internalLoadRules = useCallback(async () => {
    if (!hasAnyAuthorizedRuleType) {
      return;
    }
    setRulesState((prevRuleState) => ({ ...prevRuleState, isLoading: true }));
    try {
      const rulesResponse = await loadRules({
        http,
        page,
        searchText,
        typesFilter,
        actionTypesFilter,
        ruleExecutionStatusesFilter,
        ruleStatusesFilter,
        tagsFilter,
        sort,
      });
      setRulesState({
        isLoading: false,
        data: rulesResponse.data,
        totalItemCount: rulesResponse.total,
      });

      if (!rulesResponse.data?.length && page.index > 0) {
        onPage({ ...page, index: 0 });
      }

      const isFilterApplied = !(
        isEmpty(searchText) &&
        isEmpty(typesFilter) &&
        isEmpty(actionTypesFilter) &&
        isEmpty(ruleExecutionStatusesFilter) &&
        isEmpty(ruleStatusesFilter) &&
        isEmpty(tagsFilter)
      );

      setNoData(rulesResponse.data.length === 0 && !isFilterApplied);
    } catch (e) {
      onError(
        i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRulesMessage', {
          defaultMessage: 'Unable to load rules',
        })
      );
      setRulesState((prevRuleState) => ({ ...prevRuleState, isLoading: false }));
    }
    setInitialLoad(false);
  }, [
    http,
    page,
    searchText,
    typesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    tagsFilter,
    sort,
    hasAnyAuthorizedRuleType,
    setRulesState,
    setNoData,
    setInitialLoad,
    onPage,
    onError,
  ]);

  return {
    rulesState,
    setRulesState,
    loadRules: internalLoadRules,
    noData,
    initialLoad,
  };
}

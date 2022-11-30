/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { useQuery } from '@tanstack/react-query';
import { Pagination } from '../../types';
import type { LoadRulesProps } from '../lib/rule_api';
import { loadRulesWithKueryFilter } from '../lib/rule_api/rules_kuery_filter';
import { useKibana } from '../../common/lib/kibana';

type UseLoadRulesProps = Omit<LoadRulesProps, 'http'> & {
  hasDefaultRuleTypesFiltersOn?: boolean;
  onPage: (pagination: Pagination) => void;
  onError: (message: string) => void;
};

let initialLoad = true;

export function useLoadRules({
  page,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleLastRunOutcomesFilter,
  ruleStatusesFilter,
  tagsFilter,
  sort,
  onPage,
  onError,
  hasDefaultRuleTypesFiltersOn = false,
}: UseLoadRulesProps) {
  const { http } = useKibana().services;

  const {
    refetch,
    isLoading,
    data: rulesResponse,
  } = useQuery({
    queryKey: [
      'loadRules',
      tagsFilter,
      searchText,
      typesFilter,
      actionTypesFilter,
      page,
      sort,
      ruleStatusesFilter,
      ruleLastRunOutcomesFilter,
    ],
    queryFn: () => {
      return loadRulesWithKueryFilter({
        http,
        page,
        searchText,
        typesFilter,
        actionTypesFilter,
        ruleExecutionStatusesFilter,
        ruleLastRunOutcomesFilter,
        ruleStatusesFilter,
        tagsFilter,
        sort,
      });
    },
    onSuccess: (response) => {
      if (!response?.data?.length && page.index > 0) {
        onPage({ ...page, index: 0 });
      }
    },
    onError: () => {
      onError(
        i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRulesMessage', {
          defaultMessage: 'Unable to load rules',
        })
      );
    },
  });

  const hasEmptyTypesFilter = hasDefaultRuleTypesFiltersOn ? true : isEmpty(typesFilter);
  const isFilterApplied = !(
    isEmpty(searchText) &&
    hasEmptyTypesFilter &&
    isEmpty(actionTypesFilter) &&
    isEmpty(ruleExecutionStatusesFilter) &&
    isEmpty(ruleLastRunOutcomesFilter) &&
    isEmpty(ruleStatusesFilter) &&
    isEmpty(tagsFilter)
  );

  const noData = rulesResponse?.data.length === 0 && !isFilterApplied;
  if (initialLoad && !isLoading) {
    initialLoad = false;
  }

  return {
    rulesState: {
      isLoading,
      data: rulesResponse?.data ?? [],
      totalItemCount: rulesResponse?.total ?? 0,
    },
    noData,
    initialLoad,
    loadRules: refetch,
  };
}

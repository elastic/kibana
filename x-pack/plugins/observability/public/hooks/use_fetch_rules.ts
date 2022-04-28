/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { loadRules, loadRuleAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { RULES_LOAD_ERROR } from '../pages/rules/translations';
import { FetchRulesProps, RuleState } from '../pages/rules/types';
import { OBSERVABILITY_RULE_TYPES } from '../pages/rules/config';
import { useKibana } from '../utils/kibana_react';

export function useFetchRules({
  searchText,
  ruleLastResponseFilter,
  ruleStatusesFilter,
  typesFilter,
  tagsFilter,
  setPage,
  page,
  sort,
}: FetchRulesProps) {
  const { http } = useKibana().services;

  const [rulesState, setRulesState] = useState<RuleState>({
    isLoading: false,
    data: [],
    error: null,
    totalItemCount: 0,
  });

  const [noData, setNoData] = useState<boolean>(true);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [tags, setTags] = useState<string[]>([]);

  const loadRuleAggs = useCallback(async () => {
    try {
      const rulesAggs = await loadRuleAggregations({
        http,
        searchText,
        typesFilter,
      });

      if (rulesAggs?.ruleTags) {
        setTags(rulesAggs.ruleTags);
      }
    } catch (e) {
      // toasts.addDanger({
      //   title: i18n.translate('xpack.observability.rulesList.unableToLoadRuleStatusInfoMessage', {
      //     defaultMessage: 'Unable to load rule status info',
      //   }),
      // });
    }
  }, [http, typesFilter, searchText]);

  const fetchRules = useCallback(async () => {
    setRulesState((oldState) => ({ ...oldState, isLoading: true }));

    try {
      const response = await loadRules({
        http,
        page,
        searchText,
        typesFilter: typesFilter.length > 0 ? typesFilter : OBSERVABILITY_RULE_TYPES,
        tagsFilter,
        ruleExecutionStatusesFilter: ruleLastResponseFilter,
        ruleStatusesFilter,
        sort,
      });
      await loadRuleAggs();
      setRulesState((oldState) => ({
        ...oldState,
        isLoading: false,
        data: response.data,
        totalItemCount: response.total,
      }));

      if (!response.data?.length && page.index > 0) {
        setPage({ ...page, index: 0 });
      }
      const isFilterApplied = !(
        isEmpty(searchText) &&
        isEmpty(ruleLastResponseFilter) &&
        isEmpty(typesFilter) &&
        isEmpty(tagsFilter) &&
        isEmpty(ruleStatusesFilter)
      );

      setNoData(response.data.length === 0 && !isFilterApplied);
    } catch (_e) {
      setRulesState((oldState) => ({ ...oldState, isLoading: false, error: RULES_LOAD_ERROR }));
    }
    setInitialLoad(false);
  }, [
    http,
    page,
    setPage,
    searchText,
    ruleLastResponseFilter,
    tagsFilter,
    loadRuleAggs,
    ruleStatusesFilter,
    typesFilter,
    sort,
  ]);
  useEffect(() => {
    fetchRules();
    loadRuleAggs();
  }, [fetchRules, loadRuleAggs]);

  return {
    rulesState,
    reload: fetchRules,
    setRulesState,
    noData,
    initialLoad,
    tags,
  };
}

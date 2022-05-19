/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { loadRules, loadRuleTags } from '@kbn/triggers-actions-ui-plugin/public';
import { RULES_LOAD_ERROR, RULE_TAGS_LOAD_ERROR } from '../pages/rules/translations';
import { FetchRulesProps, RuleState, TagsState } from '../pages/rules/types';
import { useKibana } from '../utils/kibana_react';
import { usePluginContext } from './use_plugin_context';

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
  const { observabilityRuleTypeRegistry } = usePluginContext();

  const [rulesState, setRulesState] = useState<RuleState>({
    isLoading: false,
    data: [],
    error: null,
    totalItemCount: 0,
  });

  const [noData, setNoData] = useState<boolean>(true);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [tagsState, setTagsState] = useState<TagsState>({
    data: [],
    error: null,
  });
  const loadRuleTagsAggs = useCallback(async () => {
    try {
      const ruleTagsAggs = await loadRuleTags({
        http,
      });

      if (ruleTagsAggs?.ruleTags) {
        setTagsState({ data: ruleTagsAggs.ruleTags, error: null });
      }
    } catch (e) {
      setTagsState((oldState: TagsState) => ({ ...oldState, error: RULE_TAGS_LOAD_ERROR }));
    }
  }, [http]);

  const fetchRules = useCallback(async () => {
    setRulesState((oldState) => ({ ...oldState, isLoading: true }));

    try {
      const response = await loadRules({
        http,
        page,
        searchText,
        typesFilter: typesFilter.length > 0 ? typesFilter : observabilityRuleTypeRegistry.list(),
        tagsFilter,
        ruleExecutionStatusesFilter: ruleLastResponseFilter,
        ruleStatusesFilter,
        sort,
      });
      await loadRuleTagsAggs();
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
    searchText,
    typesFilter,
    observabilityRuleTypeRegistry,
    tagsFilter,
    ruleLastResponseFilter,
    ruleStatusesFilter,
    sort,
    loadRuleTagsAggs,
    setPage,
  ]);
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rulesState,
    reload: fetchRules,
    setRulesState,
    noData,
    initialLoad,
    tagsState,
  };
}

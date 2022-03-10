/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { usePluginContext } from './use_plugin_context';
import { loadRules, Rule } from '../../../triggers_actions_ui/public';
import { RULES_LOAD_ERROR } from '../pages/rules/translations';
import { FetchRulesProps } from '../pages/rules/types';
import { OBSERVABILITY_RULE_TYPES } from '../pages/rules/config';

interface RuleState {
  isLoading: boolean;
  data: Rule[];
  error: string | null;
  totalItemCount: number;
}

export function useFetchRules({ ruleLastResponseFilter, page, sort }: FetchRulesProps) {
  const { core } = usePluginContext();
  const { http } = core;

  const [rulesState, setRulesState] = useState<RuleState>({
    isLoading: false,
    data: [],
    error: null,
    totalItemCount: 0,
  });

  async function fetchRules() {
    setRulesState({ ...rulesState, isLoading: true });

    try {
      const response = await loadRules({
        http,
        page,
        typesFilter: OBSERVABILITY_RULE_TYPES,
        ruleStatusesFilter: ruleLastResponseFilter,
        sort,
      });
      setRulesState({
        ...rulesState,
        isLoading: false,
        data: response.data,
        totalItemCount: response.total,
      });
    } catch (_e) {
      setRulesState({ ...rulesState, isLoading: false, error: RULES_LOAD_ERROR });
    }
  }
  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(ruleLastResponseFilter), page, sort]);

  return {
    rulesState,
    reload: fetchRules,
    setRulesState,
  };
}

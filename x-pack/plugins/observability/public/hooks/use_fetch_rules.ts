/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { loadRules, Rule } from '../../../triggers_actions_ui/public';
import { RULES_LOAD_ERROR } from '../pages/rules/translations';
import { FetchRulesProps } from '../pages/rules/types';
import { OBSERVABILITY_RULE_TYPES } from '../pages/rules/config';
import { useKibana } from '../utils/kibana_react';

interface RuleState {
  isLoading: boolean;
  data: Rule[];
  error: string | null;
  totalItemCount: number;
}

export function useFetchRules({ ruleLastResponseFilter, page, sort }: FetchRulesProps) {
  const { http } = useKibana().services;

  const [rulesState, setRulesState] = useState<RuleState>({
    isLoading: false,
    data: [],
    error: null,
    totalItemCount: 0,
  });

  const fetchRules = useCallback(async () => {
    setRulesState((oldState) => ({ ...oldState, isLoading: true }));

    try {
      const response = await loadRules({
        http,
        page,
        typesFilter: OBSERVABILITY_RULE_TYPES,
        ruleStatusesFilter: ruleLastResponseFilter,
        sort,
      });
      setRulesState((oldState) => ({
        ...oldState,
        isLoading: false,
        data: response.data,
        totalItemCount: response.total,
      }));
    } catch (_e) {
      setRulesState((oldState) => ({ ...oldState, isLoading: false, error: RULES_LOAD_ERROR }));
    }
  }, [http, page, ruleLastResponseFilter, sort]);
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rulesState,
    reload: fetchRules,
    setRulesState,
  };
}

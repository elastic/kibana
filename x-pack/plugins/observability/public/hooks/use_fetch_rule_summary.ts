/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { FetchRuleSummaryProps, FetchRuleSummary } from '../pages/rule_details/types';
import { loadRuleSummary } from '../../../triggers_actions_ui/public';

export function useFetchRuleSummary({ ruleId, http }: FetchRuleSummaryProps) {
  const [ruleSummary, setRuleSummary] = useState<FetchRuleSummary>({
    isLoadingRuleSummary: false,
    ruleSummary: null,
    errorRuleSummary: false,
  });

  const fetchRuleSummary = useCallback(async () => {
    setRuleSummary((oldState: FetchRuleSummary) => ({ ...oldState, isLoading: true }));

    try {
      const response = await loadRuleSummary({
        http,
        ruleId,
      });
      setRuleSummary({
        isLoadingRuleSummary: false,
        ruleSummary: response,
        errorRuleSummary: false,
      });
    } catch (error) {
      setRuleSummary({
        isLoadingRuleSummary: false,
        ruleSummary: null,
        errorRuleSummary: error,
      });
    }
  }, [ruleId, http]);
  useEffect(() => {
    fetchRuleSummary();
  }, [fetchRuleSummary]);

  return { ...ruleSummary, reloadRuleSummary: fetchRuleSummary };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { FetchRuleSummaryProps, RuleSummary } from '../pages/rules/types';
import { loadRule } from '../../../triggers_actions_ui/public';
import { useKibana } from '../utils/kibana_react';

export function useFetchRule({ ruleId }: FetchRuleSummaryProps) {
  const { http } = useKibana().services;
  const [ruleSummary, setRuleSummary] = useState<RuleSummary>({
    isLoading: false,
    rule: null,
    error: false,
  });

  const fetchRuleSummary = useCallback(async () => {
    setRuleSummary((oldState: RuleSummary) => ({ ...oldState, isLoading: true }));

    try {
      const response = await loadRule({
        http,
        ruleId,
      });
      setRuleSummary({
        isLoading: false,
        rule: response,
        error: false,
      });
    } catch (_e) {
      setRuleSummary({
        isLoading: false,
        rule: null,
        error: true,
      });
    }
  }, [ruleId, http]);
  useEffect(() => {
    fetchRuleSummary();
  }, [fetchRuleSummary]);

  return ruleSummary;
}

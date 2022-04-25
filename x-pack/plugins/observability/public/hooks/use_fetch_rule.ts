/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { loadRule } from '@kbn/triggers-actions-ui-plugin/public';
import { FetchRuleProps, FetchRule } from '../pages/rule_details/types';

export function useFetchRule({ ruleId, http }: FetchRuleProps) {
  const [ruleSummary, setRuleSummary] = useState<FetchRule>({
    isLoadingRule: false,
    rule: null,
    errorRule: false,
  });

  const fetchRuleSummary = useCallback(async () => {
    setRuleSummary((oldState: FetchRule) => ({ ...oldState, isLoading: true }));

    try {
      const response = await loadRule({
        http,
        ruleId,
      });
      setRuleSummary({
        isLoadingRule: false,
        rule: response,
        errorRule: false,
      });
    } catch (_e) {
      setRuleSummary({
        isLoadingRule: false,
        rule: null,
        errorRule: true,
      });
    }
  }, [ruleId, http]);
  useEffect(() => {
    fetchRuleSummary();
  }, [fetchRuleSummary]);

  return { ...ruleSummary, reloadRule: fetchRuleSummary };
}

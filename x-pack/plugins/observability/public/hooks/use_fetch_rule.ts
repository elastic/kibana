/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { loadRule } from '@kbn/triggers-actions-ui-plugin/public';
import { FetchRuleProps, FetchRule } from '../pages/rule_details/types';
import { RULE_LOAD_ERROR } from '../pages/rule_details/translations';

export function useFetchRule({ ruleId, http }: FetchRuleProps) {
  const [ruleSummary, setRuleSummary] = useState<FetchRule>({
    isRuleLoading: true,
    rule: undefined,
    errorRule: undefined,
  });

  const fetchRuleSummary = useCallback(async () => {
    try {
      if (!ruleId) return;
      const rule = await loadRule({
        http,
        ruleId,
      });

      setRuleSummary((oldState: FetchRule) => ({
        ...oldState,
        isRuleLoading: false,
        rule,
      }));
    } catch (error) {
      setRuleSummary((oldState: FetchRule) => ({
        ...oldState,
        isRuleLoading: false,
        errorRule: RULE_LOAD_ERROR(
          error instanceof Error ? error.message : typeof error === 'string' ? error : ''
        ),
      }));
    }
  }, [ruleId, http]);
  useEffect(() => {
    fetchRuleSummary();
  }, [fetchRuleSummary]);

  return { ...ruleSummary, reloadRule: fetchRuleSummary };
}

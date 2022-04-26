/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { loadRule, loadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { FetchRuleProps, FetchRule } from '../pages/rule_details/types';

export function useFetchRule({ ruleId, http }: FetchRuleProps) {
  const [ruleSummary, setRuleSummary] = useState<FetchRule>({
    isLoadingRule: false,
    rule: undefined,
    ruleType: undefined,
    errorRule: false,
  });

  const fetchRuleSummary = useCallback(async () => {
    setRuleSummary((oldState: FetchRule) => ({ ...oldState, isLoading: true }));

    try {
      const [rule, ruleTypes] = await Promise.all([
        loadRule({
          http,
          ruleId,
        }),
        loadRuleTypes({ http }),
      ]);

      const ruleType = ruleTypes.find((type) => type.id === rule.ruleTypeId);

      setRuleSummary({ isLoadingRule: false, rule, ruleType, errorRule: false });
    } catch (_e) {
      setRuleSummary({
        isLoadingRule: false,
        rule: undefined,
        ruleType: undefined,
        errorRule: true,
      });
    }
  }, [ruleId, http]);
  useEffect(() => {
    fetchRuleSummary();
  }, [fetchRuleSummary]);

  return { ...ruleSummary, reloadRule: fetchRuleSummary };
}

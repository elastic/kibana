/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { loadRule } from '@kbn/triggers-actions-ui-plugin/public';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { Rule, RuleType } from '@kbn/triggers-actions-ui-plugin/public';

export interface FetchRuleProps {
  ruleId?: string;
  http: HttpSetup;
}

export interface FetchRule {
  isRuleLoading: boolean;
  rule?: Rule;
  ruleType?: RuleType;
  errorRule?: string;
}

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
        errorRule: i18n.translate('xpack.observability.ruleDetails.ruleLoadError', {
          defaultMessage: 'Unable to load rule. Reason: {message}',
          values: {
            message:
              error instanceof Error ? error.message : typeof error === 'string' ? error : '',
          },
        }),
      }));
    }
  }, [ruleId, http]);
  useEffect(() => {
    fetchRuleSummary();
  }, [fetchRuleSummary]);

  return { ...ruleSummary, reloadRule: fetchRuleSummary };
}

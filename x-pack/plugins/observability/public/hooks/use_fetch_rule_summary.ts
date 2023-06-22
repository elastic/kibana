/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { loadRuleSummary } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { FetchRuleSummaryProps, FetchRuleSummary } from '../pages/rule_details/types';

export function useFetchRuleSummary({ ruleId, http }: FetchRuleSummaryProps) {
  const [ruleSummary, setRuleSummary] = useState<FetchRuleSummary>({
    isLoadingRuleSummary: true,
    ruleSummary: undefined,
    errorRuleSummary: undefined,
  });

  const fetchRuleSummary = useCallback(async () => {
    setRuleSummary((oldState: FetchRuleSummary) => ({ ...oldState, isLoading: true }));

    try {
      const response = await loadRuleSummary({
        http,
        ruleId,
      });
      setRuleSummary((oldState: FetchRuleSummary) => ({
        ...oldState,
        isLoading: false,
        ruleSummary: response,
      }));
    } catch (error) {
      setRuleSummary((oldState: FetchRuleSummary) => ({
        ...oldState,
        isLoading: false,
        errorRuleSummary: i18n.translate('xpack.observability.ruleDetails.ruleLoadError', {
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

  return { ...ruleSummary, reloadRuleSummary: fetchRuleSummary };
}

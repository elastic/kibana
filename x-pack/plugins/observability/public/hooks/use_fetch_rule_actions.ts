/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { ActionConnector, loadAllActions } from '@kbn/triggers-actions-ui-plugin/public';
import { FetchRuleActionsProps } from '../pages/rule_details/types';
import { ACTIONS_LOAD_ERROR } from '../pages/rule_details/translations';

interface FetchActions {
  isLoadingActions: boolean;
  allActions: Array<ActionConnector<Record<string, unknown>>>;
  errorActions: string | undefined;
}

export function useFetchRuleActions({ http }: FetchRuleActionsProps) {
  const [ruleActions, setRuleActions] = useState<FetchActions>({
    isLoadingActions: true,
    allActions: [] as Array<ActionConnector<Record<string, unknown>>>,
    errorActions: undefined,
  });

  const fetchRuleActions = useCallback(async () => {
    try {
      const response = await loadAllActions({
        http,
      });
      setRuleActions((oldState: FetchActions) => ({
        ...oldState,
        isLoadingActions: false,
        allActions: response,
      }));
    } catch (error) {
      setRuleActions((oldState: FetchActions) => ({
        ...oldState,
        isLoadingActions: false,
        errorActions: ACTIONS_LOAD_ERROR(
          error instanceof Error ? error.message : typeof error === 'string' ? error : ''
        ),
      }));
    }
  }, [http]);
  useEffect(() => {
    fetchRuleActions();
  }, [fetchRuleActions]);

  return { ...ruleActions, reloadRuleActions: fetchRuleActions };
}

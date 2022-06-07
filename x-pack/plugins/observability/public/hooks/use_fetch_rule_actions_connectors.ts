/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { ActionConnector, loadAllActions } from '@kbn/triggers-actions-ui-plugin/public';
import { intersectionBy } from 'lodash';
import { FetchRuleActionsConnectorsProps } from '../pages/rule_details/types';
import { ACTIONS_LOAD_ERROR } from '../pages/rule_details/translations';

interface FetchActionsConnectors {
  isLoadingActionsConnectors: boolean;
  actionsConnectors: Array<ActionConnector<Record<string, unknown>>>;
  errorActionsConnectors?: string;
}

export function useFetchRuleActionsConnectors({
  http,
  ruleActions,
}: FetchRuleActionsConnectorsProps) {
  const [actionsConnectors, setActionConnector] = useState<FetchActionsConnectors>({
    isLoadingActionsConnectors: true,
    actionsConnectors: [] as Array<ActionConnector<Record<string, unknown>>>,
    errorActionsConnectors: undefined,
  });

  const fetchRuleActionsConnectors = useCallback(async () => {
    try {
      const allActions = await loadAllActions({
        http,
      });
      const actions = intersectionBy(allActions, ruleActions, 'actionTypeId');
      setActionConnector((oldState: FetchActionsConnectors) => ({
        ...oldState,
        isLoadingActionsConnectors: false,
        actionsConnectors: actions,
      }));
    } catch (error) {
      setActionConnector((oldState: FetchActionsConnectors) => ({
        ...oldState,
        isLoadingActionsConnectors: false,
        errorActionsConnectors: ACTIONS_LOAD_ERROR(
          error instanceof Error ? error.message : typeof error === 'string' ? error : ''
        ),
      }));
    }
  }, [http, ruleActions]);
  useEffect(() => {
    fetchRuleActionsConnectors();
  }, [fetchRuleActionsConnectors]);

  return {
    ...actionsConnectors,
    reloadRuleActions: fetchRuleActionsConnectors,
  };
}

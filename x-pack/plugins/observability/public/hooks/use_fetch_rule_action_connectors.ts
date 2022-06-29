/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { ActionConnector, loadAllActions } from '@kbn/triggers-actions-ui-plugin/public';
import { intersectionBy } from 'lodash';
import { FetchRuleActionConnectorsProps } from '../pages/rule_details/types';
import { ACTIONS_LOAD_ERROR } from '../pages/rule_details/translations';

interface FetchActionConnectors {
  isLoadingActionConnectors: boolean;
  actionConnectors: Array<ActionConnector<Record<string, unknown>>>;
  errorActionConnectors?: string;
}

export function useFetchRuleActionConnectors({
  http,
  ruleActions,
}: FetchRuleActionConnectorsProps) {
  const [actionConnectors, setActionConnector] = useState<FetchActionConnectors>({
    isLoadingActionConnectors: true,
    actionConnectors: [] as Array<ActionConnector<Record<string, unknown>>>,
    errorActionConnectors: undefined,
  });

  const fetchRuleActionConnectors = useCallback(async () => {
    try {
      if (!ruleActions || ruleActions.length <= 0) {
        setActionConnector((oldState: FetchActionConnectors) => ({
          ...oldState,
          isLoadingActionConnectors: false,
          actionConnectors: [],
        }));
        return;
      }
      const allActions = await loadAllActions({
        http,
      });
      const actions = intersectionBy(allActions, ruleActions, 'actionTypeId');
      setActionConnector((oldState: FetchActionConnectors) => ({
        ...oldState,
        isLoadingActionConnectors: false,
        actionConnectors: actions,
      }));
    } catch (error) {
      setActionConnector((oldState: FetchActionConnectors) => ({
        ...oldState,
        isLoadingActionConnectors: false,
        errorActionConnectors: ACTIONS_LOAD_ERROR(
          error instanceof Error ? error.message : typeof error === 'string' ? error : ''
        ),
      }));
    }
  }, [http, ruleActions]);
  useEffect(() => {
    fetchRuleActionConnectors();
  }, [fetchRuleActionConnectors]);

  return {
    ...actionConnectors,
    reloadRuleActionConnectors: fetchRuleActionConnectors,
  };
}

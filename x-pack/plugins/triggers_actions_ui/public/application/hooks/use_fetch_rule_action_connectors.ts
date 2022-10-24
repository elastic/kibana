/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionConnector, loadAllActions } from '../..';
import { useKibana } from '../../common/lib/kibana';

const ACTIONS_LOAD_ERROR = (errorMessage: string) =>
  i18n.translate('xpack.triggersActionsUI.ruleDetails.connectorsLoadError', {
    defaultMessage: 'Unable to load rule actions connectors. Reason: {message}',
    values: { message: errorMessage },
  });
interface FetchActionConnectors {
  isLoadingActionConnectors: boolean;
  actionConnectors: Array<ActionConnector<Record<string, unknown>>>;
  errorActionConnectors?: string;
}
interface FetchRuleActionConnectorsProps {
  ruleActions: any[];
}

export function useFetchRuleActionConnectors({ ruleActions }: FetchRuleActionConnectorsProps) {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

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
      setActionConnector((oldState: FetchActionConnectors) => ({
        ...oldState,
        isLoadingActionConnectors: false,
        actionConnectors: allActions,
      }));
    } catch (error) {
      const errorMsg = ACTIONS_LOAD_ERROR(
        error instanceof Error ? error.message : typeof error === 'string' ? error : ''
      );
      setActionConnector((oldState: FetchActionConnectors) => ({
        ...oldState,
        isLoadingActionConnectors: false,
        errorActionConnectors: errorMsg,
      }));
      toasts.addDanger({ title: errorMsg });
    }
  }, [http, ruleActions, toasts]);
  useEffect(() => {
    fetchRuleActionConnectors();
  }, [fetchRuleActionConnectors]);

  return {
    ...actionConnectors,
    reloadRuleActionConnectors: fetchRuleActionConnectors,
  };
}

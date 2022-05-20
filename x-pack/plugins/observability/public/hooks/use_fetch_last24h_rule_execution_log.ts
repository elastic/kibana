/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { loadExecutionLogAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { IExecutionLogWithErrorsResult } from '@kbn/alerting-plugin/common';
import moment from 'moment';
import { FetchRuleExecutionLogProps } from '../pages/rule_details/types';
import { EXECUTION_LOG_ERROR } from '../pages/rule_details/translations';
import { useKibana } from '../utils/kibana_react';

interface FetchExecutionLog {
  isLoadingExecutionLog: boolean;
  executionLog: IExecutionLogWithErrorsResult;
  errorExecutionLog?: string;
}

export function useFetchLast24hRuleExecutionLog({ http, ruleId }: FetchRuleExecutionLogProps) {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const [executionLog, setExecutionLog] = useState<FetchExecutionLog>({
    isLoadingExecutionLog: true,
    executionLog: {
      total: 0,
      data: [],
      totalErrors: 0,
      errors: [],
    },
    errorExecutionLog: undefined,
  });

  const fetchRuleActions = useCallback(async () => {
    try {
      const date = new Date().toISOString();
      const response = await loadExecutionLogAggregations({
        id: ruleId,
        dateStart: moment(date).subtract(24, 'h').toISOString(),
        dateEnd: date,
        http,
      });
      setExecutionLog((oldState: FetchExecutionLog) => ({
        ...oldState,
        isLoadingExecutionLog: false,
        executionLog: response,
      }));
    } catch (error) {
      toasts.addDanger({ title: error });
      setExecutionLog((oldState: FetchExecutionLog) => ({
        ...oldState,
        isLoadingExecutionLog: false,
        errorExecutionLog: EXECUTION_LOG_ERROR(
          error instanceof Error ? error.message : typeof error === 'string' ? error : ''
        ),
      }));
    }
  }, [http, ruleId, toasts]);
  useEffect(() => {
    fetchRuleActions();
  }, [fetchRuleActions]);

  return { ...executionLog, reloadExecutionLogs: useFetchLast24hRuleExecutionLog };
}

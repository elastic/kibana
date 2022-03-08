/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { fetchRuleExecutionEvents } from './api';
import * as i18n from './translations';

export const useRuleExecutionEvents = (ruleId: string) => {
  const { addError } = useAppToasts();

  return useQuery(
    ['ruleExecutionEvents', ruleId],
    async ({ signal }) => {
      const response = await fetchRuleExecutionEvents({ ruleId, signal });
      return response.events;
    },
    {
      onError: (e) => {
        addError(e, { title: i18n.RULE_EXECUTION_EVENTS_FETCH_FAILURE });
      },
    }
  );
};

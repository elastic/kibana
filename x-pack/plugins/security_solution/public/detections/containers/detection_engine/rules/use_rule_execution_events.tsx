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

// TODO: https://github.com/elastic/kibana/pull/121644 clean up
export const useRuleExecutionEvents = (ruleId: string) => {
  const { addError } = useAppToasts();

  return useQuery(
    'ruleExecutionEvents',
    async ({ signal }) => {
      const response = await fetchRuleExecutionEvents({ ruleId, signal });
      return response.events;
    },
    {
      onError: (e) => {
        // TODO: Should it be responsible for showing toasts?
        // TODO: Change the title
        addError(e, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
      },
    }
  );
};

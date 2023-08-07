/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

import type { GetRuleExecutionEventsResponse } from '../../../../../common/api/detection_engine/rule_monitoring';
import type { FetchRuleExecutionEventsArgs } from '../../api';
import { api } from '../../api';

import * as i18n from './translations';

export type UseExecutionEventsArgs = Omit<FetchRuleExecutionEventsArgs, 'signal'>;

export const useExecutionEvents = (args: UseExecutionEventsArgs) => {
  const { addError } = useAppToasts();

  return useQuery<GetRuleExecutionEventsResponse>(
    ['detectionEngine', 'ruleMonitoring', 'executionEvents', args],
    ({ signal }) => {
      return api.fetchRuleExecutionEvents({ ...args, signal });
    },
    {
      keepPreviousData: true,
      refetchInterval: 20000,
      onError: (e) => {
        addError(e, { title: i18n.FETCH_ERROR });
      },
    }
  );
};
